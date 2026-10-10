import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProjectForm } from '@/features/projects/components/ProjectForm'

afterEach(cleanup)

describe('ProjectForm', () => {
  it.each(['開始日', '期日'])('%sのカレンダーを日本語で表示する', async (label) => {
    render(
      <MantineProvider>
        <ProjectForm onSubmit={vi.fn()} />
      </MantineProvider>,
    )

    fireEvent.click(screen.getByLabelText(label))

    expect(await screen.findByRole('button', { name: /^\d+月 \d{4}$/ })).toBeTruthy()
    expect(screen.getAllByRole('columnheader', { hidden: true }).map((element) => element.textContent)).toEqual([
      '月', '火', '水', '木', '金', '土', '日',
    ])
  })
})
