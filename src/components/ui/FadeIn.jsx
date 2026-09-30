import { motion } from 'framer-motion'

/**
 * Мягкое появление содержимого после загрузки: пока данных нет, на экране
 * один лоадер, а как только они пришли — раздел проявляется, а не возникает
 * рывком.
 *
 * @param {{ children: import('react').ReactNode, className?: string }} props
 */
export function FadeIn({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
