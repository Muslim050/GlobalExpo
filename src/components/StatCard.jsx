import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card.jsx'
import { Sparkline } from '@/components/charts/Sparkline.jsx'
import { cn } from '@/lib/cn.js'

/**
 * Показатель-«табло»: подпись моноширинным капсом сверху, крупная цифра
 * Montserrat снизу, изменение — табличкой справа.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = 'success',
  spark,
  sparkColor = '#0E7745',
  icon: Icon,
  index = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.05,
        duration: 0.35,
        ease: [0.2, 0.9, 0.3, 1],
      }}
    >
      <Card hover className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-ink-muted">
            {Icon && (
              <span className="flex h-7 w-7 items-center justify-center bg-indigo-50 text-indigo-600">
                <Icon size={15} strokeWidth={2} />
              </span>
            )}
            <span className="eyebrow">{label}</span>
          </div>
          {delta != null && (
            <span
              className={cn(
                'tnum border px-1.5 py-px font-mono text-[10.5px] font-semibold',
                deltaTone === 'success'
                  ? 'border-success/25 bg-success/8 text-success'
                  : 'border-danger/25 bg-danger/8 text-danger',
              )}
            >
              {delta}
            </span>
          )}
        </div>
        <div className="mt-5 flex items-end justify-between gap-2">
          <span className="whitespace-nowrap font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-ink tnum sm:text-[26px]">
            {value}
          </span>
          {spark && (
            <div className="mb-0.5 hidden shrink-0 sm:block">
              <Sparkline
                data={spark}
                color={sparkColor}
                width={72}
                height={32}
              />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
