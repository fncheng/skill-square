import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalErrorToast?: boolean;
    skipAuthReset?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipGlobalErrorToast?: boolean;
    skipAuthReset?: boolean;
  }
}
