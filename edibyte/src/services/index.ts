import * as real from './api';
import * as mock from './mockApi';

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true';

/** Single entry point for the app. Components import `api` and never care which one is active. */
export const api: typeof real = useMock ? mock : real;
