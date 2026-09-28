export const STATUS_LABEL: Record<string, string> = {
  running: 'Running', awaiting_competitors: 'Confirm competitors', review: 'Ready for review', published: 'Published', failed: 'Failed',
};
export const KIND_LABEL: Record<string, string> = { ready: 'Ready agent', adapt: 'Agent to adapt', build: 'Agent to build', service: 'OneUpAI service', client: 'Client task' };
export const PHASE_LABEL: Record<string, string> = { foundations: 'Days 1-30: foundations', pace: 'Days 31-60: build the pace', compound: 'Days 61-90: compound' };
