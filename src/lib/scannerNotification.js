export function buildScannerHookedNotification(getT) {
  return {
    title: getT('app.scanner_title'),
    message: getT('app.scanner_hooked_message'),
    image: '',
    position: 'top-right',
    no_focus: true,
    silent: true,
  };
}
