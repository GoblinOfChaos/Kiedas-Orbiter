import React, { Suspense, lazy } from 'react'
import { useUi } from '../../contexts/UiContext'
import { getCurrentWindow } from '@tauri-apps/api/window'
import ToastOverlay from './ToastOverlay'
import SidebarOverlay from './SidebarOverlay'

const RelicRewardOverlay = lazy(() => import('./RelicRewardOverlay'))
const RivenOverlay = lazy(() => import('./RivenOverlay'))
const RelicPickerOverlay = lazy(() => import('./RelicPickerOverlay'))

const LABEL_TO_POS = {
  'overlay-tr': 'top-right',
  'overlay-tl': 'top-left',
  'overlay-tc': 'top-center',
}

export default function OverlayRouter() {
  const { t } = useUi()
  const label = getCurrentWindow().label

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

  if (label === 'overlay-sidebar') {
    return <SidebarOverlay />
  }

  return null
}
