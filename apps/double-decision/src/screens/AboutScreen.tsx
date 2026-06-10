interface Props {
  onBack: () => void;
}

export default function AboutScreen({ onBack }: Props) {
  return (
    <div style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto', flex: 1 }}>
      <button onClick={onBack} style={{ color: 'var(--fg-dim)', fontSize: '0.85rem' }}>
        ‹ Back
      </button>

      <h1 style={{ fontSize: '1.7rem', fontWeight: 700, marginTop: 12, letterSpacing: '-0.02em' }}>
        About Double Decision
      </h1>

      <section style={{ marginTop: 18, color: 'var(--fg)', lineHeight: 1.55, fontSize: '0.95rem' }}>
        <p>
          This is an open-source clone of the speed-of-processing training paradigm
          used in the <strong>ACTIVE trial</strong> (Ball et al. 2002, JAMA), and
          productised commercially as <em>Double Decision</em> by Posit Science's
          BrainHQ.
        </p>

        <h2 style={{ fontSize: '1.1rem', marginTop: 22, marginBottom: 6 }}>The honest pitch</h2>
        <p>
          Of all the cognitive-training paradigms that have been studied, this
          one has the best evidence of <em>real-world far transfer</em>: in
          large randomised trials of older adults, training based on this task
          has been linked to roughly 50% fewer at-fault driving crashes (Ball,
          Edwards, Ross & McGwin 2010, JAGS), less decline in everyday-living
          activities at 10 years (Rebok et al. 2014, JAGS), lower rates of
          clinically meaningful depressive symptoms (Wolinsky et al. 2009,
          J Gerontol A), and — in one trial — a 29% reduction in dementia
          incidence over 10 years (Edwards et al. 2017, Alzheimer's & Dementia: TRCI).
        </p>

        <h2 style={{ fontSize: '1.1rem', marginTop: 22, marginBottom: 6 }}>What to be careful about</h2>
        <p>
          The evidence is concentrated in <strong>older adults (65+)</strong>.
          It is not established that healthy adults under ~50 get the same
          real-world benefit. The ACTIVE trial used a no-contact control group,
          so engagement and expectancy effects are not fully ruled out, and the
          National Academies of Sciences (2017) rated the field as "encouraging
          but inconclusive". The dementia finding has not been replicated under
          tighter methodological conditions.
        </p>

        <h2 style={{ fontSize: '1.1rem', marginTop: 22, marginBottom: 6 }}>How this version differs from BrainHQ's</h2>
        <ul style={{ paddingLeft: 20, marginTop: 6 }}>
          <li style={{ marginBottom: 4 }}>
            Includes a post-stimulus visual mask. BrainHQ's commercial version omits this;
            classical UFOV experimental work has always included one.
          </li>
          <li style={{ marginBottom: 4 }}>
            Uses neutral geometric stimuli (a triangle or square at the centre;
            a filled star among hollow-star distractors) rather than the
            desert-highway theme.
          </li>
          <li style={{ marginBottom: 4 }}>
            Open source, MIT-licensed, no tracking, no account.
          </li>
        </ul>

        <h2 style={{ fontSize: '1.1rem', marginTop: 22, marginBottom: 6 }}>How scoring works</h2>
        <p>
          Each trial flashes the stimuli for the duration the adaptive staircase
          currently estimates is right for you. After the flash you answer both
          parts: which shape was at the centre, and where the star was. A trial
          only counts as correct when <em>both</em> are right — that divided-attention
          demand is the whole point of the paradigm. The staircase shortens the
          duration after 3 correct in a row, and lengthens it after a single
          mistake (3-down-1-up). Your reported threshold is the geometric mean
          of the last few duration values where the staircase changed direction.
          Browser display timing is quantised to your screen's refresh rate, so
          durations floor at about three frames (~50&nbsp;ms).
        </p>
      </section>
    </div>
  );
}
