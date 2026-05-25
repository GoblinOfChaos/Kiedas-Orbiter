import React, { Suspense, lazy } from 'react'
import { appWindow } from '@tauri-apps/api/window'
import ToastOverlay from './ToastOverlay'

const RelicRewardOverlay = lazy(() => import('./RelicRewardOverlay'))
const RivenOverlay = lazy(() => import('./RivenOverlay'))

const LABEL_TO_POS = {
  'overlay-tr': 'top-right',
  'overlay-tl': 'top-left',
  'overlay-tc': 'top-center',
}

export default function OverlayRouter() {
  const label = appWindow.label

  if (LABEL_TO_POS[label]) {
    return <ToastOverlay position={LABEL_TO_POS[label]} />
  }

  if (label === 'overlay-relic') {
    return (
      <Suspense fallback={null}>
        <RelicRewardOverlay />
      </Suspense>
    )
  }

  if (label === 'overlay-riven-current' || label === 'overlay-riven-new') {
    return (
      <Suspense fallback={null}>
        <RivenOverlay />
      </Suspense>
    )
  }

  return null
}
