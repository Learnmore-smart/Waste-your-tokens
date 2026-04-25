import { formatCompact, formatFixed, type Impact } from '../lib/impact'

export default function MetricsHud(props: {
  totalTokens: number
  impact: Impact
  burning: boolean
  mode: 'simulate' | 'api'
  lastError?: string
}) {
  const { totalTokens, impact, burning, mode, lastError } = props

  return (
    <section className="hud" aria-label="Live metrics">
      <div className="hudRow">
        <div className="hudKicker">Total tokens wasted</div>
        <div className="hudValue" aria-live="polite">
          {formatCompact(Math.max(0, Math.round(totalTokens)))}
        </div>
      </div>

      <div className="hudGrid" aria-label="Environmental guilt tracker">
        <div className="hudStat">
          <div className="hudLabel">CO₂e</div>
          <div className="hudNum">{formatFixed(Math.max(0, impact.gramsCO2), 2)} g</div>
        </div>
        <div className="hudStat">
          <div className="hudLabel">Miles</div>
          <div className="hudNum">{formatFixed(Math.max(0, impact.milesDriven), 3)}</div>
        </div>
        <div className="hudStat">
          <div className="hudLabel">Trees</div>
          <div className="hudNum">{formatFixed(Math.max(0, impact.treesToOffset), 4)}</div>
        </div>
      </div>

      <div className="hudMeta">
        <div className={burning ? 'hudPill hudPillOn' : 'hudPill'}>{burning ? 'Burning' : 'Idle'}</div>
        <div className="hudPill">{mode === 'api' ? 'API' : 'Sim'}</div>
      </div>

      {lastError ? <div className="hudError">{lastError}</div> : null}
    </section>
  )
}

