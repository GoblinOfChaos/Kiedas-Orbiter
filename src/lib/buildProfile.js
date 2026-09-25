export const IS_PREVIEW = import.meta.env.MODE === 'preview';
export const BUILD_ID = typeof __KIEDA_BUILD_ID__ !== 'undefined' ? __KIEDA_BUILD_ID__ : 'dev';
