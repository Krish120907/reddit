import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

const POST_FIELDS = 'id,created_at,updated_at,author_id,community_id,title,type,body,url,image_url,score,comment_count,is_nsfw,is_spoiler,is_pinned'
const PROFILE_FIELDS = 'id,username,followers_count,following_count,karma'

function shortName(name = 'reader') {
  return name.replace(/^u\//, '').trim() || 'reader'
}

function timeAgo(date) {
  if (!date) return 'just now'
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function Avatar({ name, small = false }) {
  const initial = shortName(name).slice(0, 1).toUpperCase()
  return <span className={`avatar${small ? ' avatar-small' : ''}`} aria-hidden="true">{initial}</span>
}

function AuthDialog({ mode, setMode, onClose, onSubmit, busy, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  function submit(event) {
    event.preventDefault()
    onSubmit({ email, password, username })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <span className="dialog-mark">r/</span>
        <h2 id="auth-title">{mode === 'signup' ? 'Join the conversation' : 'Welcome back'}</h2>
        <p className="muted">{mode === 'signup' ? 'Create an account to post, vote, and join communities.' : 'Sign in to pick up where you left off.'}</p>
        <form className="stack-form" onSubmit={submit}>
          {mode === 'signup' && <label>Username<input autoComplete="username" minLength="3" maxLength="20" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="3–20 characters" /></label>}
          <label>Email<input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} type="password" minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">{mode === 'signup' ? 'Already a member?' : 'New to reddit?'} <button className="text-button" type="button" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>
      </section>
    </div>
  )
}

function CreatePostDialog({ communities, onClose, onSubmit, busy, error, initialCommunity }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [communityId, setCommunityId] = useState(initialCommunity || '')
  const [type, setType] = useState('text')
  const [isNsfw, setIsNsfw] = useState(false)
  const [isSpoiler, setIsSpoiler] = useState(false)

  function submit(event) {
    event.preventDefault()
    onSubmit({ title, body, url, communityId: communityId || null, type, isNsfw, isSpoiler })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog compose-dialog" role="dialog" aria-modal="true" aria-labelledby="compose-title">
        <div className="dialog-heading"><div><p className="eyebrow">CREATE A POST</p><h2 id="compose-title">Start a conversation</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button></div>
        <form className="stack-form" onSubmit={submit}>
          <label>Community<select value={communityId} onChange={(event) => setCommunityId(event.target.value)}><option value="">Choose a community</option>{communities.map((community) => <option key={community.id} value={community.id}>r/{community.name}</option>)}</select></label>
          <div className="segmented" role="group" aria-label="Post type">
            {['text', 'link', 'image'].map((item) => <button key={item} type="button" className={type === item ? 'selected' : ''} onClick={() => setType(item)}>{item === 'text' ? 'Text' : item === 'link' ? 'Link' : 'Image'}</button>)}
          </div>
          <label>Title<input required maxLength="300" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="An interesting title" /></label>
          {type === 'text' && <label>Text<textarea rows="6" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share the details…" /></label>}
          {type === 'link' && <><label>URL<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /></label><label>Comment (optional)<textarea rows="3" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add some context…" /></label></>}
          {type === 'image' && <><label>Image URL<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/image.jpg" /></label><label>Caption (optional)<textarea rows="3" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add a caption…" /></label></>}
          <div className="checkbox-row"><label><input type="checkbox" checked={isNsfw} onChange={(event) => setIsNsfw(event.target.checked)} /> Mark as 18+</label><label><input type="checkbox" checked={isSpoiler} onChange={(event) => setIsSpoiler(event.target.checked)} /> Spoiler</label></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Publishing…' : 'Publish post'}</button></div>
        </form>
      </section>
    </div>
  )
}

function CommunityDialog({ onClose, onSubmit, busy, error }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="community-title">
        <div className="dialog-heading"><div><p className="eyebrow">NEW COMMUNITY</p><h2 id="community-title">Make a place for it</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button></div>
        <form className="stack-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ name, description }) }}>
          <label>Community name<input required minLength="3" maxLength="21" pattern="[A-Za-z0-9_]+" value={name} onChange={(event) => setName(event.target.value)} placeholder="like gardening" /><span className="field-hint">3–21 letters, numbers, or underscores</span></label>
          <label>Description<textarea rows="4" maxLength="500" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is this community about?" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Creating…' : 'Create community'}</button></div>
        </form>
      </section>
    </div>
  )
}

function CommentsDialog({ post, comments, profileMap, user, voteMap, onVote, onReply, onDelete, replyTo, setReplyTo, onClose, onSubmit, busy, error, loading }) {
  const [body, setBody] = useState('')
  const replyAuthor = replyTo ? profileMap[comments.find((comment) => comment.id === replyTo)?.author_id]?.username : null
  async function submitComment(event) {
    event.preventDefault()
    if (await onSubmit(body, replyTo)) {
      setBody('')
      setReplyTo(null)
    }
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog comments-dialog" role="dialog" aria-modal="true" aria-labelledby="comments-title">
        <div className="dialog-heading"><div><p className="eyebrow">DISCUSSION</p><h2 id="comments-title">{post.title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button></div>
        {post.body && <p className="comment-post-body">{post.body}</p>}
        <div className="comments-list">
          {loading ? <div className="empty-inline">Loading comments…</div> : comments.length === 0 ? <div className="empty-inline"><strong>No comments yet.</strong><span>Be the first to add something helpful.</span></div> : comments.map((comment) => {
            const author = profileMap[comment.author_id]?.username || 'deleted'
            const currentVote = voteMap[comment.id] || 0
            return <article className={`comment-item${comment.parent_id ? ' comment-reply' : ''}`} key={comment.id}><Avatar name={author} small /><div className="comment-content"><div className="comment-meta"><strong>u/{shortName(author)}</strong><span>·</span><span>{timeAgo(comment.created_at)}</span>{comment.updated_at && comment.updated_at !== comment.created_at && <span>edited</span>}</div><p>{comment.is_deleted ? '[comment removed]' : comment.body}</p><div className="comment-actions"><button type="button" className={currentVote === 1 ? 'voted' : ''} onClick={() => onVote(comment.id, 1)} disabled={!user} aria-label="Upvote comment">▲</button><span>{comment.score ?? 0}</span><button type="button" className={currentVote === -1 ? 'voted' : ''} onClick={() => onVote(comment.id, -1)} disabled={!user} aria-label="Downvote comment">▼</button>{!comment.is_deleted && <button type="button" onClick={() => onReply(comment.id)} disabled={!user}>Reply</button>}{user?.id === comment.author_id && !comment.is_deleted && <button type="button" onClick={() => onDelete(comment.id)}>Delete</button>}</div></div></article>
          })}
        </div>
        <form className="comment-form" onSubmit={submitComment}>
          {user ? <>{replyTo && <div className="replying-to">Replying to u/{shortName(replyAuthor || 'user')} <button type="button" className="text-button" onClick={() => setReplyTo(null)}>Cancel</button></div>}<label className="sr-only" htmlFor="new-comment">Add a comment</label><textarea id="new-comment" rows="3" maxLength="10000" value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? 'Write a reply…' : 'What are your thoughts?'} required /><div className="comment-form-bottom">{error && <span className="form-error">{error}</span>}<button className="button button-primary" disabled={busy || !body.trim()}>{busy ? 'Commenting…' : replyTo ? 'Reply' : 'Comment'}</button></div></> : <p className="muted">Sign in to join the discussion.</p>}
        </form>
      </section>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [posts, setPosts] = useState([])
  const [communities, setCommunities] = useState([])
  const [profiles, setProfiles] = useState([])
  const [readerBoard, setReaderBoard] = useState([])
  const [memberships, setMemberships] = useState([])
  const [follows, setFollows] = useState([])
  const [postVotes, setPostVotes] = useState({})
  const [commentVotes, setCommentVotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [authMode, setAuthMode] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [selectedPost, setSelectedPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentBusy, setCommentBusy] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [selectedCommunity, setSelectedCommunity] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('new')
  const [activeNav, setActiveNav] = useState('home')
  const [mobileMenu, setMobileMenu] = useState(false)

  const profileMap = useMemo(() => Object.fromEntries(profiles.map((profile) => [profile.id, profile])), [profiles])
  const communityMap = useMemo(() => Object.fromEntries(communities.map((community) => [community.id, community])), [communities])
  const user = session?.user || null
  const ownProfile = user ? profileMap[user.id] : null

  const loadData = useCallback(async (currentUserId = null) => {
    if (!supabase) {
      setDataError('Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local to connect this app.')
      setLoading(false)
      return
    }
    setLoading(true)
    setDataError('')
    const [postsResult, communitiesResult, profilesResult, booksResult] = await Promise.all([
      supabase.from('posts').select(POST_FIELDS).order('created_at', { ascending: false }).limit(50),
      supabase.from('communities').select('id,created_at,name,description,creator_id,icon_url,banner_url,member_count').order('member_count', { ascending: false }).limit(30),
      supabase.from('profiles').select(PROFILE_FIELDS).order('karma', { ascending: false }).limit(50),
      supabase.from('books').select('id,username,karma,account_age,contributions,followers,is_read').order('karma', { ascending: false }).limit(8),
    ])
    const firstError = postsResult.error || communitiesResult.error || profilesResult.error || booksResult.error
    if (firstError) setDataError(firstError.message)
    setPosts(postsResult.data || [])
    setCommunities(communitiesResult.data || [])
    setProfiles(profilesResult.data || [])
    setReaderBoard(booksResult.data || [])

    if (currentUserId) {
      const [membershipResult, followResult, voteResult, commentVoteResult] = await Promise.all([
        supabase.from('memberships').select('community_id').eq('user_id', currentUserId),
        supabase.from('follows').select('following_id').eq('follower_id', currentUserId),
        supabase.from('post_votes').select('post_id,value').eq('user_id', currentUserId),
        supabase.from('comment_votes').select('comment_id,value').eq('user_id', currentUserId),
      ])
      if (!firstError) {
        const accessError = membershipResult.error || followResult.error || voteResult.error || commentVoteResult.error
        if (accessError) setDataError(accessError.message)
      }
      setMemberships((membershipResult.data || []).map((row) => row.community_id))
      setFollows((followResult.data || []).map((row) => row.following_id))
      setPostVotes(Object.fromEntries((voteResult.data || []).map((row) => [row.post_id, row.value])))
      setCommentVotes(Object.fromEntries((commentVoteResult.data || []).map((row) => [row.comment_id, row.value])))
    } else {
      setMemberships([])
      setFollows([])
      setPostVotes({})
      setCommentVotes({})
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) {
      void loadData()
      return undefined
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      void loadData(data.session?.user?.id || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      window.setTimeout(() => loadData(nextSession?.user?.id || null), 0)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadData])

  const visiblePosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    let filtered = posts.filter((post) => {
      if (selectedCommunity && post.community_id !== selectedCommunity.id) return false
      if (activeNav === 'popular' && !selectedCommunity) { /* sorted below */ }
      if (normalizedSearch) {
        const communityName = communityMap[post.community_id]?.name || ''
        const authorName = profileMap[post.author_id]?.username || ''
        return `${post.title} ${post.body || ''} ${communityName} ${authorName}`.toLowerCase().includes(normalizedSearch)
      }
      return true
    })
    if (sort === 'top' || activeNav === 'popular') filtered = [...filtered].sort((a, b) => (b.score || 0) - (a.score || 0))
    return filtered
  }, [posts, search, sort, activeNav, selectedCommunity, communityMap, profileMap])

  const notify = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3200)
  }

  function requireUser() {
    setActionError('')
    if (!user) {
      setAuthError('')
      setAuthMode('signin')
      return false
    }
    return true
  }

  async function handleAuth({ email, password, username }) {
    if (!supabase) return
    setAuthBusy(true)
    setAuthError('')
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { data: { username: username.trim() } } })
      : await supabase.auth.signInWithPassword({ email, password })
    if (result.error) {
      setAuthError(result.error.message)
      setAuthBusy(false)
      return
    }
    if (authMode === 'signup' && !result.data.session) {
      setNotice('Check your email to confirm your account, then sign in.')
      setAuthMode('')
      setAuthBusy(false)
      return
    }
    let profileError = null
    if (result.data.user && result.data.session) {
      const fallbackUsername = `reader_${result.data.user.id.slice(0, 8)}`
      const savedProfile = await supabase.from('profiles').upsert({ id: result.data.user.id, username: username?.trim() || result.data.user.user_metadata?.username || fallbackUsername }, { onConflict: 'id', ignoreDuplicates: true })
      profileError = savedProfile.error
      if (profileError) setAuthError(profileError.message)
      setSession(result.data.session)
      await loadData(result.data.user.id)
    }
    setAuthBusy(false)
    if (!profileError) setAuthMode('')
  }

  async function handleSignOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setActionError(error.message)
    else {
      setSession(null)
      setNotice('You’ve signed out.')
      await loadData(null)
    }
  }

  async function createPost(payload) {
    if (!requireUser() || !supabase) return
    if (!payload.communityId) {
      setDialogError('Choose a community before publishing.')
      return
    }
    setDialogBusy(true)
    setDialogError('')
    const { error } = await supabase.from('posts').insert({
      title: payload.title.trim(), body: payload.body.trim() || null, url: payload.url.trim() || null,
      type: payload.type, image_url: payload.type === 'image' ? payload.url.trim() : null,
      author_id: user.id, community_id: payload.communityId,
      is_nsfw: payload.isNsfw, is_spoiler: payload.isSpoiler,
    })
    setDialogBusy(false)
    if (error) { setDialogError(error.message); return }
    setComposeOpen(false)
    setSelectedCommunity(null)
    setActiveNav('home')
    notify('Your post is live.')
    await loadData(user.id)
  }

  async function createCommunity({ name, description }) {
    if (!requireUser() || !supabase) return
    setDialogBusy(true)
    setDialogError('')
    const { data, error } = await supabase.from('communities').insert({ name: name.trim(), description: description.trim() || null, creator_id: user.id }).select('id').single()
    if (!error && data?.id) await supabase.from('memberships').insert({ user_id: user.id, community_id: data.id, role: 'owner' })
    setDialogBusy(false)
    if (error) { setDialogError(error.message); return }
    setCommunityOpen(false)
    notify(`r/${name} is ready.`)
    await loadData(user.id)
  }

  async function toggleMembership(community) {
    if (!requireUser() || !supabase) return
    const isMember = memberships.includes(community.id)
    const result = isMember
      ? await supabase.from('memberships').delete().eq('user_id', user.id).eq('community_id', community.id)
      : await supabase.from('memberships').insert({ user_id: user.id, community_id: community.id, role: 'member' })
    if (result.error) { setActionError(result.error.message); return }
    setMemberships((current) => isMember ? current.filter((id) => id !== community.id) : [...current, community.id])
    notify(isMember ? `Left r/${community.name}.` : `Joined r/${community.name}.`)
  }

  async function toggleFollow(profile) {
    if (!requireUser() || !supabase || profile.id === user.id) return
    const isFollowing = follows.includes(profile.id)
    const result = isFollowing
      ? await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id)
      : await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id })
    if (result.error) { setActionError(result.error.message); return }
    setFollows((current) => isFollowing ? current.filter((id) => id !== profile.id) : [...current, profile.id])
    notify(isFollowing ? `Unfollowed u/${shortName(profile.username)}.` : `Following u/${shortName(profile.username)}.`)
  }

  async function togglePostVote(post, value) {
    if (!requireUser() || !supabase) return
    const previous = postVotes[post.id] || 0
    const next = previous === value ? 0 : value
    const result = next
      ? await supabase.from('post_votes').upsert({ user_id: user.id, post_id: post.id, value: next }, { onConflict: 'user_id,post_id' })
      : await supabase.from('post_votes').delete().eq('user_id', user.id).eq('post_id', post.id)
    if (result.error) { setActionError(result.error.message); return }
    setPostVotes((current) => ({ ...current, [post.id]: next }))
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, score: (item.score || 0) + next - previous } : item))
  }

  async function openComments(post) {
    setSelectedPost(post)
    setComments([])
    setCommentError('')
    setReplyTo(null)
    setCommentsLoading(true)
    if (supabase) {
      const { data, error } = await supabase.from('comments').select('id,created_at,updated_at,post_id,author_id,parent_id,body,score,is_deleted').eq('post_id', post.id).order('created_at', { ascending: true })
      if (error) setCommentError(error.message)
      else setComments(data || [])
    }
    setCommentsLoading(false)
  }

  async function createComment(body, parentId = null) {
    if (!requireUser() || !supabase || !selectedPost) return false
    setCommentBusy(true)
    setCommentError('')
    const { error } = await supabase.from('comments').insert({ post_id: selectedPost.id, author_id: user.id, parent_id: parentId, body: body.trim() })
    setCommentBusy(false)
    if (error) { setCommentError(error.message); return false }
    notify('Comment added.')
    await openComments(selectedPost)
    await loadData(user.id)
    return true
  }

  async function deleteComment(commentId) {
    if (!user || !supabase) return
    const { error } = await supabase.from('comments').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', commentId).eq('author_id', user.id)
    if (error) { setCommentError(error.message); return }
    setComments((current) => current.map((comment) => comment.id === commentId ? { ...comment, is_deleted: true } : comment))
    notify('Comment removed.')
  }

  async function editPost(post) {
    if (!user || !supabase) return
    const title = window.prompt('Edit post title', post.title)
    if (title === null) return
    const body = window.prompt('Edit post text', post.body || '')
    if (body === null) return
    const { error } = await supabase.from('posts').update({ title: title.trim(), body: body.trim() || null, updated_at: new Date().toISOString() }).eq('id', post.id).eq('author_id', user.id)
    if (error) { setActionError(error.message); return }
    notify('Post updated.')
    await loadData(user.id)
  }

  async function deletePost(post) {
    if (!user || !supabase || !window.confirm('Delete this post and its comments?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('author_id', user.id)
    if (error) { setActionError(error.message); return }
    notify('Post deleted.')
    await loadData(user.id)
  }

  async function toggleCommentVote(commentId, value) {
    if (!requireUser() || !supabase) return
    const previous = commentVotes[commentId] || 0
    const next = previous === value ? 0 : value
    const result = next
      ? await supabase.from('comment_votes').upsert({ user_id: user.id, comment_id: commentId, value: next }, { onConflict: 'user_id,comment_id' })
      : await supabase.from('comment_votes').delete().eq('user_id', user.id).eq('comment_id', commentId)
    if (result.error) { setCommentError(result.error.message); return }
    setCommentVotes((current) => ({ ...current, [commentId]: next }))
    setComments((current) => current.map((comment) => comment.id === commentId ? { ...comment, score: (comment.score || 0) + next - previous } : comment))
  }

  function selectCommunity(community) {
    setSelectedCommunity(community)
    setSelectedProfile(null)
    setActiveNav('home')
    setMobileMenu(false)
  }

  const topCommunities = communities.slice(0, 6)
  const myCommunities = communities.filter((community) => memberships.includes(community.id))
  const topProfiles = profiles.filter((profile) => profile.id !== user?.id).slice(0, 5)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="mobile-menu-button icon-button" type="button" onClick={() => setMobileMenu((open) => !open)} aria-label="Toggle navigation">☰</button>
          <button className="brand" type="button" onClick={() => { setSelectedCommunity(null); setSelectedProfile(null); setActiveNav('home') }} aria-label="reddit home"><span className="brand-mark">r</span><span>reddit</span></button>
          <div className="search-wrap"><span className="search-glyph" aria-hidden="true">⌕</span><input aria-label="Search posts and communities" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Reddit" /></div>
          <div className="topbar-actions">
            {user ? <><button className="button button-primary create-top" type="button" onClick={() => { setDialogError(''); setComposeOpen(true) }}><span>＋</span> Create</button><button className="account-button" type="button" onClick={handleSignOut} title="Sign out"><Avatar name={ownProfile?.username || user.email} small /><span className="account-name">{ownProfile?.username || user.email?.split('@')[0] || 'Account'}</span><span aria-hidden="true">⌄</span></button></> : <><button className="button button-quiet login-top" type="button" onClick={() => { setAuthError(''); setAuthMode('signin') }}>Log in</button><button className="button button-primary" type="button" onClick={() => { setAuthError(''); setAuthMode('signup') }}>Sign up</button></>}
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className={`left-rail${mobileMenu ? ' is-open' : ''}`}>
          <nav className="primary-nav" aria-label="Main navigation">
            <button className={activeNav === 'home' && !selectedCommunity ? 'nav-item active' : 'nav-item'} onClick={() => { setSelectedCommunity(null); setSelectedProfile(null); setActiveNav('home'); setSort('new'); setMobileMenu(false) }}><span className="nav-icon">⌂</span> Home</button>
            <button className={activeNav === 'popular' ? 'nav-item active' : 'nav-item'} onClick={() => { setSelectedCommunity(null); setSelectedProfile(null); setActiveNav('popular'); setSort('top'); setMobileMenu(false) }}><span className="nav-icon">↗</span> Popular</button>
            <button className="nav-item" onClick={() => { setCommunityOpen(true); setDialogError(''); setMobileMenu(false) }}><span className="nav-icon">＋</span> Create a community</button>
          </nav>
          <div className="rail-rule" />
          <div className="rail-heading">YOUR COMMUNITIES <span>{myCommunities.length || ''}</span></div>
          {myCommunities.length ? <div className="community-nav">{myCommunities.map((community) => <button key={community.id} className="community-nav-item" onClick={() => selectCommunity(community)}><span className="community-badge">{community.name.slice(0, 1).toUpperCase()}</span><span>r/{community.name}</span></button>)}</div> : <p className="rail-empty">Join a community to build your home feed.</p>}
          <div className="rail-rule" />
          <div className="rail-heading">EXPLORE</div>
          <div className="community-nav">{topCommunities.map((community) => <button key={community.id} className="community-nav-item" onClick={() => selectCommunity(community)}><span className="community-badge">{community.name.slice(0, 1).toUpperCase()}</span><span>r/{community.name}</span></button>)}</div>
          {communities.length === 0 && <p className="rail-empty">Communities will show up here.</p>}
          <div className="left-rail-footer"><span>About</span><span>Rules</span><span>Privacy</span><small>© 2026 Reddit, Inc.</small></div>
        </aside>

        <main className="feed-column">
          <div className="feed-heading">
            <div><p className="eyebrow">{selectedCommunity ? 'COMMUNITY' : activeNav === 'popular' ? 'TRENDING' : 'YOUR FRONT PAGE'}</p><h1>{selectedCommunity ? `r/${selectedCommunity.name}` : activeNav === 'popular' ? 'Popular posts' : 'Home'}</h1></div>
            {selectedCommunity && user && <button className={`button ${memberships.includes(selectedCommunity.id) ? 'button-quiet' : 'button-primary'}`} onClick={() => toggleMembership(selectedCommunity)}>{memberships.includes(selectedCommunity.id) ? 'Joined' : 'Join'}</button>}
          </div>

          {dataError && <div className="notice notice-error" role="alert"><strong>Can’t load live data</strong><span>{dataError}</span><button className="text-button" onClick={() => loadData(user?.id || null)}>Try again</button></div>}
          {!dataError && !loading && posts.length === 0 && <div className="notice notice-info"><strong>No posts appeared.</strong><span>This can mean the feed is empty or Supabase Row Level Security policies are still blocking reads. Check the project’s Policies page if you expect existing data.</span></div>}
          {actionError && <div className="notice notice-error action-notice" role="alert"><span>{actionError}</span><button className="icon-button" onClick={() => setActionError('')} aria-label="Dismiss">×</button></div>}

          <button className="composer-prompt" type="button" onClick={() => { if (requireUser()) { setDialogError(''); setComposeOpen(true) } }}>
            <Avatar name={ownProfile?.username || user?.email || 'you'} />
            <span>Share something with the community</span>
            <span className="composer-image" aria-hidden="true">▧</span>
          </button>

          <div className="sort-bar"><span>FEED</span><div className="sort-options"><button className={sort === 'new' && activeNav !== 'popular' ? 'sort-active' : ''} onClick={() => { setSort('new'); setActiveNav('home') }}>◷ New</button><button className={sort === 'top' || activeNav === 'popular' ? 'sort-active' : ''} onClick={() => { setSort('top'); setActiveNav('popular') }}>↗ Top</button></div></div>

          <section className="post-list" aria-label="Posts">
            {loading ? <div className="loading-card"><span className="spinner" />Loading your feed…</div> : visiblePosts.length === 0 ? <div className="empty-state"><div className="empty-illustration">✳</div><h2>{search ? 'No matches found' : selectedCommunity ? `Nothing in r/${selectedCommunity.name} yet` : 'Your feed is waiting'}</h2><p>{search ? 'Try a different search.' : 'Start a conversation, or join a community to find your people.'}</p><div className="empty-actions"><button className="button button-primary" onClick={() => { if (requireUser()) { setDialogError(''); setComposeOpen(true) } }}>Create a post</button><button className="button button-quiet" onClick={() => setCommunityOpen(true)}>Create community</button></div></div> : visiblePosts.map((post) => {
              const community = communityMap[post.community_id]
              const author = profileMap[post.author_id]
              const currentVote = postVotes[post.id] || 0
              return <article className="post-card" key={post.id}>
                <div className="vote-rail"><button className={`vote-button${currentVote === 1 ? ' voted' : ''}`} type="button" disabled={!user} onClick={() => togglePostVote(post, 1)} aria-label="Upvote post" title={user ? 'Upvote' : 'Sign in to vote'}>▲</button><span className="vote-score">{post.score ?? 0}</span><button className={`vote-button downvote${currentVote === -1 ? ' voted' : ''}`} type="button" disabled={!user} onClick={() => togglePostVote(post, -1)} aria-label="Downvote post" title={user ? 'Downvote' : 'Sign in to vote'}>▼</button></div>
                <div className="post-main">
                  <div className="post-meta"><button className="post-community" type="button" onClick={() => community && selectCommunity(community)}><span className="community-dot">{community?.name?.slice(0, 1).toUpperCase() || 'r'}</span>{community ? `r/${community.name}` : 'r/community'}</button><span>·</span><span>Posted by</span><button className="author-link" type="button" onClick={() => author && setSelectedProfile(author)}>u/{shortName(author?.username || 'unknown')}</button><span>{timeAgo(post.created_at)}</span>{post.updated_at && post.updated_at !== post.created_at && <span>· edited</span>}{post.is_pinned && <span className="pill pill-pinned">Pinned</span>}</div>
                  <button className="post-title-button" type="button" onClick={() => openComments(post)}><h2 className="post-title">{post.is_spoiler && <span className="pill pill-spoiler">Spoiler</span>}{post.is_nsfw && <span className="pill pill-nsfw">18+</span>}{post.title}</h2></button>
                  {post.type === 'link' && post.url && <a className="post-link" href={post.url} target="_blank" rel="noreferrer">↗ {post.url.replace(/^https?:\/\//, '').split('/')[0]}</a>}
                  {post.type === 'image' && (post.image_url || post.url) && <img className="post-image" src={post.image_url || post.url} alt="Post attachment" loading="lazy" />}
                  {post.body && <p className="post-body">{post.body}</p>}
                  <div className="post-actions"><button type="button" onClick={() => openComments(post)}><span>▤</span>{post.comment_count ?? 0} comments</button><button type="button" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => notify('Link copied.')).catch(() => notify('Could not copy link.'))}><span>↗</span>Share</button>{user?.id === post.author_id && <><button type="button" onClick={() => editPost(post)}>Edit</button><button type="button" onClick={() => deletePost(post)}>Delete</button></>}</div>
                </div>
              </article>
            })}
          </section>
        </main>

        <aside className="right-rail">
          {selectedCommunity ? <section className="side-card community-about"><div className="community-banner"><span className="community-badge community-badge-large">{selectedCommunity.name.slice(0, 1).toUpperCase()}</span></div><div className="side-card-content"><p className="eyebrow">COMMUNITY</p><h2>r/{selectedCommunity.name}</h2><p className="side-description">{selectedCommunity.description || 'A community for sharing and discussion.'}</p><div className="community-stats"><span><strong>{selectedCommunity.member_count ?? 0}</strong> members</span><span><strong>{posts.filter((post) => post.community_id === selectedCommunity.id).length}</strong> posts shown</span></div><button className={`button button-full ${memberships.includes(selectedCommunity.id) ? 'button-quiet' : 'button-primary'}`} onClick={() => toggleMembership(selectedCommunity)}>{memberships.includes(selectedCommunity.id) ? 'Joined' : 'Join community'}</button><button className="button button-full button-quiet side-create-post" onClick={() => { if (requireUser()) { setDialogError(''); setComposeOpen(true) } }}>Create a post</button></div></section> : <section className="welcome-card"><div className="welcome-art"><span className="welcome-spark spark-one">✦</span><span className="welcome-orbit">r</span><span className="welcome-spark spark-two">✳</span><span className="welcome-dot">●</span></div><div className="welcome-copy"><p className="eyebrow">FIND YOUR PEOPLE</p><h2>Good things happen when people talk.</h2><p>Follow the conversations you care about.</p>{!user && <button className="button button-primary button-full" onClick={() => { setAuthError(''); setAuthMode('signup') }}>Join Reddit</button>}</div></section>}

          <section className="side-card"><div className="side-card-heading"><h2>Communities to explore</h2><button className="text-button" onClick={() => setCommunityOpen(true)}>＋ Create</button></div>{topCommunities.length ? <div className="side-community-list">{topCommunities.map((community) => <div className="side-community" key={community.id}><button className="community-identity" onClick={() => selectCommunity(community)}><span className="community-badge">{community.name.slice(0, 1).toUpperCase()}</span><span><strong>r/{community.name}</strong><small>{community.member_count ?? 0} members</small></span></button><button className={memberships.includes(community.id) ? 'mini-button joined' : 'mini-button'} onClick={() => toggleMembership(community)}>{memberships.includes(community.id) ? 'Joined' : 'Join'}</button></div>)}</div> : <div className="side-empty"><span className="empty-mini-icon">⌂</span><p>No communities yet</p><button className="text-button" onClick={() => setCommunityOpen(true)}>Create the first one</button></div>}</section>

          {topProfiles.length > 0 && <section className="side-card"><div className="side-card-heading"><h2>People to follow</h2><span className="side-heading-icon">♙</span></div><div className="side-community-list">{topProfiles.map((profile) => <div className="side-community" key={profile.id}><button className="community-identity" onClick={() => setSelectedProfile(profile)}><Avatar name={profile.username} small /><span><strong>u/{shortName(profile.username)}</strong><small>{profile.karma ?? 0} karma</small></span></button><button className={follows.includes(profile.id) ? 'mini-button joined' : 'mini-button'} onClick={() => toggleFollow(profile)}>{follows.includes(profile.id) ? 'Following' : 'Follow'}</button></div>)}</div></section>}

          <section className="side-card"><div className="side-card-heading"><h2>Books & reader stats</h2><span className="side-heading-icon">▤</span></div>{readerBoard.length ? <div className="side-community-list">{readerBoard.map((entry) => <div className="reader-entry" key={entry.id}><div className="reader-entry-title"><strong>{entry.username}</strong><span className={`reader-status${entry.is_read ? ' is-read' : ''}`}>{entry.is_read ? 'Read' : 'Unread'}</span></div><div className="reader-entry-stats"><span>{entry.karma ?? 0} karma</span><span>{entry.contributions ?? 0} contributions</span><span>{entry.followers ?? 0} followers</span><span>{entry.account_age ?? 0} days here</span></div></div>)}</div> : <div className="side-empty"><span className="empty-mini-icon">▤</span><p>No reader stats yet</p><small>Records from the existing books table will show here.</small></div>}</section>

          <section className="side-card profile-card"><div className="side-card-heading"><h2>Your corner</h2><span className="side-heading-icon">✦</span></div>{user ? <div className="own-profile"><Avatar name={ownProfile?.username || user.email} /><div><strong>u/{shortName(ownProfile?.username || user.email?.split('@')[0])}</strong><small>{ownProfile?.karma ?? 0} karma</small></div><div className="own-stats"><span><strong>{ownProfile?.followers_count ?? 0}</strong> followers</span><span><strong>{ownProfile?.following_count ?? 0}</strong> following</span></div></div> : <div className="side-empty"><p>Sign in to manage your communities, follow people, and save your place.</p><button className="text-button" onClick={() => { setAuthError(''); setAuthMode('signin') }}>Log in</button></div>}</section>

          <footer className="right-footer"><a href="#about" onClick={(event) => event.preventDefault()}>About</a><a href="#content-policy" onClick={(event) => event.preventDefault()}>Content policy</a><a href="#privacy" onClick={(event) => event.preventDefault()}>Privacy</a><span>© 2026 Reddit-inspired community</span></footer>
        </aside>
      </div>

      {notice && <div className="toast" role="status">{notice}</div>}
      {authMode && <AuthDialog mode={authMode} setMode={(mode) => { setAuthError(''); setAuthMode(mode) }} onClose={() => setAuthMode('')} onSubmit={handleAuth} busy={authBusy} error={authError} />}
      {composeOpen && <CreatePostDialog communities={communities} initialCommunity={selectedCommunity?.id} onClose={() => setComposeOpen(false)} onSubmit={createPost} busy={dialogBusy} error={dialogError} />}
      {communityOpen && <CommunityDialog onClose={() => setCommunityOpen(false)} onSubmit={createCommunity} busy={dialogBusy} error={dialogError} />}
      {selectedPost && <CommentsDialog post={selectedPost} comments={comments} profileMap={profileMap} user={user} voteMap={commentVotes} onVote={toggleCommentVote} onReply={setReplyTo} onDelete={deleteComment} replyTo={replyTo} setReplyTo={setReplyTo} onClose={() => setSelectedPost(null)} onSubmit={createComment} busy={commentBusy} error={commentError} loading={commentsLoading} />}
      {selectedProfile && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedProfile(null)}><section className="dialog profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title"><button className="icon-button dialog-close" onClick={() => setSelectedProfile(null)} aria-label="Close">×</button><div className="profile-dialog-head"><Avatar name={selectedProfile.username} /><div><p className="eyebrow">REDDIT PROFILE</p><h2 id="profile-title">u/{shortName(selectedProfile.username)}</h2></div></div><div className="profile-metrics"><span><strong>{selectedProfile.karma ?? 0}</strong> karma</span><span><strong>{selectedProfile.followers_count ?? 0}</strong> followers</span><span><strong>{selectedProfile.following_count ?? 0}</strong> following</span></div><button className={`button button-full ${follows.includes(selectedProfile.id) ? 'button-quiet' : 'button-primary'}`} onClick={() => toggleFollow(selectedProfile)}>{follows.includes(selectedProfile.id) ? 'Following' : 'Follow'}</button></section></div>}
    </div>
  )
}

export default App
