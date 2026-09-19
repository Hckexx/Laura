export type AndroidRelease = {
  id: string;
  versionName: string;
  versionCode: number;
  releaseNotes: string | null;
  apkPath: string;
  publishedAt: string;
};

export type AndroidReleaseState =
  | {
      status: 'loading';
      release: null;
    }
  | {
      status: 'ready';
      release: AndroidRelease;
    }
  | {
      status: 'unavailable';
      release: null;
    };