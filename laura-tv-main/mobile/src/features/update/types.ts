export type AppRelease = {
  id: string;
  platform: 'android';
  versionName: string;
  versionCode: number;
  releaseNotes: string | null;
  apkPath: string | null;
  publishedAt: string;
};

export type CachedReleasePolicy = {
  latestVersionCode: number;
  latestVersionName: string;
  releaseNotes: string | null;
  apkPath: string | null;
  checkedAt: number;
};

export type UpdateGateState =
  | {
      status: 'checking';
    }
  | {
      status: 'allowed';
    }
  | {
      status: 'required';
      release: AppRelease;
    }
  | {
      status: 'failed-but-allowed';
    };