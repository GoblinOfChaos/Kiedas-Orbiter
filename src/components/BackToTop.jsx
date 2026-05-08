import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'

export default function BackToTop({ containerRef, threshold = 200 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const container = containerRef?.current

    const handleScroll = () => {
      const scrollTop = container ? container.scrollTop : window.scrollY
      setVisible(scrollTop > threshold)
    }

    if (container) {
      container.addEventListener('scroll', handleScroll)
      handleScroll()
      return () => container.removeEventListener('scroll', handleScroll)
    } else {
      // Fallback to window scroll
      window.addEventListener('scroll', handleScroll)
      handleScroll()
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [containerRef, threshold])

  const scrollToTop = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (!visible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-kronos-accent/90 text-kronos-bg shadow-lg hover:bg-kronos-accent transition-all duration-200 hover:scale-110 animate-fade-in"
      title="Back to top"
    >
      <ChevronUp size={20} strokeWidth={2.5} />
    </button>
  )
}