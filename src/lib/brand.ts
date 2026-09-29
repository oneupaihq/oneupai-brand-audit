import { ONEUPAI_LOGO_SVG } from './oneupai-logo';

// Who the written report says prepared it. Override per deployment in the Vercel environment.
export const PREPARED_BY = process.env.REPORT_PREPARED_BY || 'Nick Zarzycki, OneUpAI';
export const PREPARED_EMAIL = process.env.REPORT_PREPARED_EMAIL || 'nz@oneupai.com';
export const ONEUPAI_LOGO_DATA_URL = `data:image/svg+xml;base64,${Buffer.from(ONEUPAI_LOGO_SVG).toString('base64')}`;
