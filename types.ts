
export interface BookMetadata {
  title: string;
  author: string;
  summary: string;
  genre: string;
  keyTakeaways: string[];
}

export interface PageData {
  imageUrl: string;
  text: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  READING = 'READING',
  ERROR = 'ERROR'
}
