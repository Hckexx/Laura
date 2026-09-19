export type AnnouncementType =
  | 'info'
  | 'warning'
  | 'maintenance';

export type AppAnnouncement = {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  maintenanceMode: boolean;
  createdAt: string;
};

export type AnnouncementGateState =
  | {
      status: 'checking';
    }
  | {
      status: 'ready';
      announcement: AppAnnouncement | null;
    }
  | {
      status: 'maintenance';
      announcement: AppAnnouncement;
    };