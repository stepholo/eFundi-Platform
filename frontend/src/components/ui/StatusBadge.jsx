const CONFIG = {
  requested:   { label: 'Submitted',    bg: '#F1F5F9',             color: '#475569'  },
  broadcasted: { label: 'Finding Tech', bg: '#FFF7ED',             color: '#EA580C'  },
  assigned:    { label: 'Assigned',     bg: '#EFF6FF',             color: '#1D4ED8'  },
  in_progress: { label: 'In Progress',  bg: '#F0FDF4',             color: '#16A34A'  },
  completed:   { label: 'Completed',    bg: '#F0FDF4',             color: '#15803D'  },
  cancelled:   { label: 'Cancelled',    bg: '#FEF2F2',             color: '#DC2626'  },
}

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] ?? { label: status, bg: '#F1F5F9', color: '#475569' }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
      fontSize: '13px', fontWeight: '600', fontFamily: 'DM Mono',
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}
