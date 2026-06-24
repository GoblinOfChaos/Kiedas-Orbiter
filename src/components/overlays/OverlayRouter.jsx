import React, { Suspense, lazy } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import ToastOverlay from './ToastOverlay'

const RelicRewardOverlay = lazy(() => import('./RelicRewardOverlay'))
const RivenOverlay = lazy(() => import('./RivenOverlay'))
const RelicPickerOverlay = lazy(() => import('./RelicPickerOverlay'))
const SidebarOverlay = lazy(() => import('./SidebarOverlay'))

const LABEL_TO_POS = {
  'overlay-tr': 'top-right',
  'overlay-tl': 'top-left',
  'overlay-tc': 'top-center',
}

export default function OverlayRouter() {
  const label = getCurrentWindow().label

  if (label === 'overlay-sidebar') {
    return (
      <Suspense fallback={null}>
        <SidebarOverlay />
      </Suspense>
    )
  }

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

  if (label === 'overlay-relic-picker') {
    return (
      <Suspense fallback={null}>
        <RelicPickerOverlay />
      </Suspense>
    )
  }

  return null
}
