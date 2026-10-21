import { useEffect, useState } from 'react'

type ReactDoctorAntipatternDemoProps = {
  title: string
  items: string[]
}

// React Doctor の検知確認用に、3種類のアンチパターンを意図的に残します。
export function ReactDoctorAntipatternDemo({ title, items }: ReactDoctorAntipatternDemoProps) {
  const [displayTitle, setDisplayTitle] = useState(title)

  useEffect(() => {
    setDisplayTitle(title.toUpperCase())
  }, [title])

  function DemoNotice() {
    return <p>動作確認用。マージしない</p>
  }

  return (
    <section aria-label="React Doctor 検知確認">
      <h3>{displayTitle}</h3>
      <DemoNotice />
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
