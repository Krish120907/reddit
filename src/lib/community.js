export function escapeLikeTerm(value) {
  return String(value ?? '').replace(/[\\%_]/g, '\\$&')
}

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'discussion'
}

export function postPath(post) {
  return `/comments/${encodeURIComponent(post.id)}/${slugify(post.title)}`
}

export function profilePath(username) {
  return `/u/${encodeURIComponent(username || 'unknown')}`
}

export function shortName(name = 'reader') {
  return String(name).replace(/^u\//, '').trim() || 'reader'
}

export function timeAgo(date) {
  if (!date) return 'just now'
  const timestamp = Date.parse(date)
  if (!Number.isFinite(timestamp)) return 'just now'
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function rankPosts(posts, sort = 'new', now = Date.now()) {
  const getTime = (post) => {
    const time = Date.parse(post.created_at)
    return Number.isFinite(time) ? time : 0
  }

  return [...posts].sort((a, b) => {
    if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) return a.is_pinned ? -1 : 1
    if (sort === 'top') {
      const scoreDifference = (b.score || 0) - (a.score || 0)
      return scoreDifference || getTime(b) - getTime(a)
    }
    if (sort === 'hot') {
      const hotScore = (post) => {
        const score = Number(post.score) || 0
        const sign = score > 0 ? 1 : score < 0 ? -1 : 0
        const order = Math.log10(Math.max(Math.abs(score), 1))
        const ageSeconds = Math.max(0, (now - getTime(post)) / 1000)
        return order + sign * ageSeconds / 45_000
      }
      const scoreDifference = hotScore(b) - hotScore(a)
      return scoreDifference || getTime(b) - getTime(a)
    }
    return getTime(b) - getTime(a)
  })
}

export function buildCommentTree(comments, sort = 'old') {
  const nodes = new Map(comments.map((comment) => [comment.id, { ...comment, children: [] }]))
  const roots = []
  const cycleRoots = new Set()

  for (const start of nodes.values()) {
    const path = []
    const pathIndexes = new Map()
    let current = start
    while (current && nodes.has(current.parent_id)) {
      if (pathIndexes.has(current.id)) {
        const cycle = path.slice(pathIndexes.get(current.id))
        cycleRoots.add(cycle.map((node) => node.id).sort()[0])
        break
      }
      pathIndexes.set(current.id, path.length)
      path.push(current)
      current = nodes.get(current.parent_id)
    }
  }

  const compare = (a, b) => {
    if (sort === 'top') return (b.score || 0) - (a.score || 0) || Date.parse(a.created_at) - Date.parse(b.created_at)
    if (sort === 'new') return Date.parse(b.created_at) - Date.parse(a.created_at)
    return Date.parse(a.created_at) - Date.parse(b.created_at)
  }

  for (const node of nodes.values()) {
    const parent = cycleRoots.has(node.id) ? null : nodes.get(node.parent_id)
    if (parent && parent.id !== node.id) parent.children.push(node)
    else roots.push(node)
  }

  const sortTree = (items) => {
    items.sort(compare)
    items.forEach((item) => sortTree(item.children))
  }
  sortTree(roots)
  return roots
}
