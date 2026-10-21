type ReactDoctorAntipatternDemoProps = {
  title: string
  items: string[]
}

// React Doctor の検知確認用に、配列の index を key に使います。
export function ReactDoctorAntipatternDemo({ title, items }: ReactDoctorAntipatternDemoProps) {
  return (
    <section aria-label="React Doctor 検知確認">
      <p><strong>{title.toUpperCase()}</strong></p>
      <p>動作確認用。マージしない</p>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
