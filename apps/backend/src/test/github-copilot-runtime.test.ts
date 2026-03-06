import { mkdtemp, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GithubCopilotRuntime } from '../swarm/github-copilot-runtime.js'
import type { AgentDescriptor } from '../swarm/types.js'

function makeDescriptor(baseDir: string): AgentDescriptor {
  return {
    agentId: 'copilot-worker',
    displayName: 'GitHub Copilot Worker',
    role: 'worker',
    managerId: 'manager',
    status: 'idle',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    cwd: baseDir,
    model: {
      provider: 'github-copilot',
      modelId: 'gpt-4o',
      thinkingLevel: 'xhigh',
    },
    sessionFile: join(baseDir, 'sessions', 'copilot-worker.jsonl'),
  }
}

describe('GithubCopilotRuntime', () => {
  it('returns a clear startup error when the github-copilot-agent binary is missing', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'swarm-github-copilot-runtime-'))
    const descriptor = makeDescriptor(tempDir)
    await mkdir(dirname(descriptor.sessionFile), { recursive: true })

    const previousBin = process.env.GITHUB_COPILOT_BIN
    process.env.GITHUB_COPILOT_BIN = join(tempDir, 'missing-github-copilot-binary')

    try {
      await expect(
        GithubCopilotRuntime.create({
          descriptor,
          callbacks: {
            onStatusChange: async () => {},
          },
          systemPrompt: 'You are a test GitHub Copilot runtime.',
          tools: [],
        }),
      ).rejects.toThrow('GitHub Copilot agent is not installed or not available on PATH')
    } finally {
      if (previousBin === undefined) {
        delete process.env.GITHUB_COPILOT_BIN
      } else {
        process.env.GITHUB_COPILOT_BIN = previousBin
      }
    }
  })
})
