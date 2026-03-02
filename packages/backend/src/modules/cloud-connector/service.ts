import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { EC2Client, DescribeInstancesCommand, type Instance } from '@aws-sdk/client-ec2';
import { RDSClient, DescribeDBInstancesCommand, type DBInstance } from '@aws-sdk/client-rds';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db';
import { cloudAccounts, resources } from '../../db/schema';
import type { ResourceType, ResourceStatus } from '@finops/shared';

interface AssumeRoleConfig {
  arnRole: string;
  externalId: string;
  region: string;
}

interface TemporaryCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

interface ScannedResource {
  externalId: string;
  resourceType: ResourceType;
  name: string | null;
  status: ResourceStatus;
  tags: Record<string, string>;
  metadata: Record<string, unknown>;
}

function getAwsConfig(region: string) {
  const config: Record<string, unknown> = { region };
  // LocalStack対応: 開発環境ではエンドポイントURLを使用
  if (process.env.AWS_ENDPOINT_URL) {
    config.endpoint = process.env.AWS_ENDPOINT_URL;
    config.forcePathStyle = true;
  }
  return config;
}

/** AssumeRole でクロスアカウント認証 */
export async function assumeRole(config: AssumeRoleConfig): Promise<TemporaryCredentials> {
  const stsClient = new STSClient(getAwsConfig(config.region));

  const command = new AssumeRoleCommand({
    RoleArn: config.arnRole,
    ExternalId: config.externalId,
    RoleSessionName: `finops-scan-${Date.now()}`,
    DurationSeconds: 3600,
  });

  const response = await stsClient.send(command);

  if (!response.Credentials?.AccessKeyId || !response.Credentials?.SecretAccessKey || !response.Credentials?.SessionToken) {
    throw new Error('AssumeRoleで有効な認証情報を取得できませんでした');
  }

  return {
    accessKeyId: response.Credentials.AccessKeyId,
    secretAccessKey: response.Credentials.SecretAccessKey,
    sessionToken: response.Credentials.SessionToken,
  };
}

/** EC2インスタンスのステータスマッピング */
function mapEc2Status(state: string | undefined): ResourceStatus {
  switch (state) {
    case 'running': return 'running';
    case 'stopped': return 'stopped';
    case 'terminated': return 'terminated';
    default: return 'unknown';
  }
}

/** RDSインスタンスのステータスマッピング */
function mapRdsStatus(status: string | undefined): ResourceStatus {
  switch (status) {
    case 'available': return 'running';
    case 'stopped': return 'stopped';
    case 'deleting':
    case 'deleted': return 'terminated';
    default: return 'unknown';
  }
}

/** EC2タグをRecord形式に変換 */
function parseTags(tags: Array<{ Key?: string; Value?: string }> | undefined): Record<string, string> {
  if (!tags) return {};
  return tags.reduce<Record<string, string>>((acc, tag) => {
    if (tag.Key) acc[tag.Key] = tag.Value || '';
    return acc;
  }, {});
}

/** EC2インスタンスのスキャン */
export async function scanEC2Instances(
  credentials: TemporaryCredentials,
  region: string,
): Promise<ScannedResource[]> {
  const ec2Client = new EC2Client({
    ...getAwsConfig(region),
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const command = new DescribeInstancesCommand({});
  const response = await ec2Client.send(command);

  const instances: ScannedResource[] = [];

  for (const reservation of response.Reservations || []) {
    for (const instance of reservation.Instances || []) {
      if (!instance.InstanceId) continue;

      const tags = parseTags(instance.Tags);
      instances.push({
        externalId: instance.InstanceId,
        resourceType: 'ec2',
        name: tags['Name'] || null,
        status: mapEc2Status(instance.State?.Name),
        tags,
        metadata: {
          instanceType: instance.InstanceType,
          region,
          az: instance.Placement?.AvailabilityZone,
          launchTime: instance.LaunchTime?.toISOString(),
          privateIp: instance.PrivateIpAddress,
          publicIp: instance.PublicIpAddress,
          vpcId: instance.VpcId,
        },
      });
    }
  }

  return instances;
}

/** RDSインスタンスのスキャン */
export async function scanRDSInstances(
  credentials: TemporaryCredentials,
  region: string,
): Promise<ScannedResource[]> {
  const rdsClient = new RDSClient({
    ...getAwsConfig(region),
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const command = new DescribeDBInstancesCommand({});
  const response = await rdsClient.send(command);

  return (response.DBInstances || [])
    .filter((db: DBInstance) => db.DBInstanceIdentifier)
    .map((instance: DBInstance) => ({
      externalId: instance.DBInstanceIdentifier!,
      resourceType: 'rds' as ResourceType,
      name: instance.DBInstanceIdentifier || null,
      status: mapRdsStatus(instance.DBInstanceStatus),
      tags: {},
      metadata: {
        instanceType: instance.DBInstanceClass,
        engine: instance.Engine,
        engineVersion: instance.EngineVersion,
        region,
        az: instance.AvailabilityZone,
        multiAz: instance.MultiAZ,
        storageGb: instance.AllocatedStorage,
        endpoint: instance.Endpoint?.Address,
        port: instance.Endpoint?.Port,
      },
    }));
}

/** 全リソーススキャン（EC2+RDS） */
export async function scanAllResources(accountId: string): Promise<{ scanned: number }> {
  // 1. DBからアカウント情報を取得
  const [account] = await db
    .select()
    .from(cloudAccounts)
    .where(and(eq(cloudAccounts.id, accountId), eq(cloudAccounts.isActive, true)))
    .limit(1);

  if (!account) {
    throw new Error('クラウドアカウントが見つからないか、無効化されています');
  }

  if (!account.arnRole) {
    throw new Error('ARN Roleが設定されていません');
  }

  // 2. AssumeRoleでクロスアカウント認証
  const credentials = await assumeRole({
    arnRole: account.arnRole,
    externalId: account.externalId,
    region: account.region,
  });

  // 3. EC2 + RDS を並列スキャン
  const [ec2Results, rdsResults] = await Promise.all([
    scanEC2Instances(credentials, account.region),
    scanRDSInstances(credentials, account.region),
  ]);

  const allResources = [...ec2Results, ...rdsResults];

  // 4. リソースをDB に Upsert（INSERT ON CONFLICT UPDATE）
  for (const resource of allResources) {
    await db
      .insert(resources)
      .values({
        cloudAccountId: accountId,
        resourceType: resource.resourceType,
        externalId: resource.externalId,
        name: resource.name,
        status: resource.status,
        tags: resource.tags,
        metadata: resource.metadata,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [resources.cloudAccountId, resources.externalId],
        set: {
          name: resource.name,
          status: resource.status,
          tags: resource.tags,
          metadata: resource.metadata,
          lastSeenAt: new Date(),
        },
      });
  }

  // 5. last_scan_at を更新
  await db
    .update(cloudAccounts)
    .set({ lastScanAt: new Date() })
    .where(eq(cloudAccounts.id, accountId));

  return { scanned: allResources.length };
}
