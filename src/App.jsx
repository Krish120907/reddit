import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { escapeLikeTerm, rankPosts } from './lib/community'
import PostCard from './components/PostCard'
import PostDetailPage from './components/PostDetailPage'
import ProfilePage from './components/ProfilePage'
import SearchPage from './components/SearchPage'
import { SiteFooter, StaticPage } from './components/SitePages'
import './App.css'

const POST_FIELDS = 'id,created_at,updated_at,author_id,community_id,title,type,body,url,image_url,score,comment_count,is_nsfw,is_spoiler,is_pinned'
const PROFILE_FIELDS = 'id,created_at,username,followers_count,following_count,karma,"Contributions_count"'

function shortName(name = 'reader') {
  return name.replace(/^u\//, '').trim() || 'reader'
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

function App() {
  const [session, setSession] = useState(null)
  const [posts, setPosts] = useState([])
  const [communities, setCommunities] = useState([])
  const [profiles, setProfiles] = useState([])
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
  const [commentError, setCommentError] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('new')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [path, setPath] = useState(window.location.pathname + window.location.search)
  const [savedPostIds, setSavedPostIds] = useState(() => { try { return JSON.parse(localStorage.getItem('reddit-saved-posts') || '[]') } catch { return [] } })
  const [searchResults, setSearchResults] = useState({ posts: [], communities: [], profiles: [] })
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [detailPost, setDetailPost] = useState(null)
  const [detailComments, setDetailComments] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [profilePage, setProfilePage] = useState(null)
  const [profilePosts, setProfilePosts] = useState([])
  const [profileComments, setProfileComments] = useState([])
  const [profileLoading, setProfileLoading] = useState(false)
  const [routePosts, setRoutePosts] = useState(null)
  const [routePostsLoading, setRoutePostsLoading] = useState(false)

  const navigate = useCallback((to) => { history.pushState({}, '', to); setPath(to); window.scrollTo(0, 0) }, [])
  useEffect(() => { const pop = () => setPath(location.pathname + location.search); addEventListener('popstate', pop); return () => removeEventListener('popstate', pop) }, [])
  useEffect(() => { localStorage.setItem('reddit-saved-posts', JSON.stringify(savedPostIds)) }, [savedPostIds])
  const route = useMemo(() => {
    const url = new URL(path, location.origin)
    const parts = url.pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part))
    return { url, parts }
  }, [path])
  const toggleSave = (postId) => setSavedPostIds((ids) => ids.includes(postId) ? ids.filter((id) => id !== postId) : [...ids, postId])
  const sharePost = async (post) => { const link = `${location.origin}/comments/${encodeURIComponent(post.id)}`; try { await navigator.clipboard.writeText(link); notify('Link copied.') } catch { notify(link) } }

  const profileMap = useMemo(() => Object.fromEntries(profiles.map((profile) => [profile.id, profile])), [profiles])
  const communityMap = useMemo(() => Object.fromEntries(communities.map((community) => [community.id, community])), [communities])
  const user = session?.user || null
  const ownProfile = user ? profileMap[user.id] : null

  const loadData = useCallback(async (currentUserId = null) => {
    if (!supabase) {
      setDataError(import.meta.env.PROD ? 'This Vercel build has no Supabase settings. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the Vercel project, then redeploy.' : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local to connect this app.')
      setLoading(false)
      return
    }
    setLoading(true)
    setDataError('')
    const [postsResult, communitiesResult, profilesResult] = await Promise.all([
      supabase.from('posts').select(POST_FIELDS).order('created_at', { ascending: false }).limit(50),
      supabase.from('communities').select('id,created_at,name,description,creator_id,icon_url,banner_url,member_count').order('member_count', { ascending: false }).limit(30),
      supabase.from('profiles').select(PROFILE_FIELDS).order('karma', { ascending: false }).limit(50),
    ])
    const firstError = postsResult.error || communitiesResult.error || profilesResult.error
    if (firstError) setDataError(firstError.message)
    setPosts(postsResult.data || [])
    setCommunities(communitiesResult.data || [])
    setProfiles(profilesResult.data || [])

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
      queueMicrotask(() => loadData())
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

  useEffect(() => {
    if (route.parts[0] !== 'search') return
    const term = route.url.searchParams.get('q')?.trim() || ''
    let active = true
    if (!term || !supabase) { queueMicrotask(() => { if (active) { setSearchResults({ posts: [], communities: [], profiles: [] }); setSearchLoading(false) } }); return () => { active = false } }
    queueMicrotask(() => { if (active) { setSearchLoading(true); setSearchError('') } })
    const pattern = `%${escapeLikeTerm(term)}%`
    Promise.all([
      supabase.from('posts').select(POST_FIELDS).ilike('title', pattern).order('created_at', { ascending: false }).limit(50),
      supabase.from('posts').select(POST_FIELDS).ilike('body', pattern).order('created_at', { ascending: false }).limit(50),
      supabase.from('posts').select(POST_FIELDS).ilike('url', pattern).order('created_at', { ascending: false }).limit(50),
      supabase.from('communities').select('id,created_at,name,description,creator_id,icon_url,banner_url,member_count').ilike('name', pattern).limit(30),
      supabase.from('profiles').select(PROFILE_FIELDS).ilike('username', pattern).limit(30),
    ]).then(([p, b, l, c, u]) => { if (!active) return; const err = p.error || b.error || l.error || c.error || u.error; const merged = [...(p.data || []), ...(b.data || []), ...(l.data || [])]; setSearchError(err?.message || ''); setSearchResults({ posts: [...new Map(merged.map((post) => [post.id, post])).values()], communities: c.data || [], profiles: u.data || [] }); setSearchLoading(false) })
    return () => { active = false }
  }, [path, route, route.parts])

  useEffect(() => {
    if (route.parts[0] !== 'comments' || !route.parts[1] || !supabase) return undefined
    let active = true; queueMicrotask(() => { if (active) { setDetailLoading(true); setDetailPost(null); setDetailComments([]) } })
    Promise.all([
      supabase.from('posts').select(POST_FIELDS).eq('id', route.parts[1]).maybeSingle(),
      supabase.from('comments').select('id,created_at,updated_at,post_id,author_id,parent_id,body,score,is_deleted').eq('post_id', route.parts[1]).order('created_at', { ascending: true }),
    ]).then(([p, c]) => { if (!active) return; setDetailPost(p.data || null); setDetailComments(c.data || []); setDetailLoading(false); if (p.error || c.error) setCommentError((p.error || c.error).message) })
    return () => { active = false }
  }, [path, route])

  useEffect(() => {
    const type = route.parts[0]
    if (!supabase || !['r', 'saved'].includes(type)) { queueMicrotask(() => setRoutePosts(null)); return undefined }
    let active = true
    queueMicrotask(() => { if (active) { setRoutePostsLoading(true); setRoutePosts([]) } })
    if (type === 'saved') {
      if (!savedPostIds.length) { queueMicrotask(() => { if (active) setRoutePostsLoading(false) }); return () => { active = false } }
      supabase.from('posts').select(POST_FIELDS).in('id', savedPostIds).order('created_at', { ascending: false }).then(({ data, error }) => { if (!active) return; setRoutePosts(data || []); setRoutePostsLoading(false); if (error) setActionError(error.message) })
    } else {
      const community = communities.find((item) => item.name.toLowerCase() === route.parts[1]?.toLowerCase())
      if (!community) { if (!loading) queueMicrotask(() => { if (active) setRoutePostsLoading(false) }) }
      else supabase.from('posts').select(POST_FIELDS).eq('community_id', community.id).order('created_at', { ascending: false }).limit(50).then(({ data, error }) => { if (!active) return; setRoutePosts(data || []); setRoutePostsLoading(false); if (error) setActionError(error.message) })
    }
    return () => { active = false }
  }, [path, route, communities, savedPostIds, loading])

  useEffect(() => {
    if (route.parts[0] !== 'u' || !route.parts[1] || !supabase) return undefined
    let active = true; queueMicrotask(() => { if (active) { setProfileLoading(true); setProfilePage(null) } })
    supabase.from('profiles').select(PROFILE_FIELDS).ilike('username', route.parts[1]).maybeSingle().then(async ({ data, error }) => {
      if (!active) return
      if (error || !data) { setProfileLoading(false); return }
      const [p, c] = await Promise.all([supabase.from('posts').select(POST_FIELDS).eq('author_id', data.id).order('created_at', { ascending: false }).limit(50), supabase.from('comments').select('id,created_at,post_id,body,is_deleted').eq('author_id', data.id).order('created_at', { ascending: false }).limit(50)])
      if (!active) return; setProfilePage(data); setProfilePosts(p.data || []); setProfileComments(c.data || []); setProfileLoading(false)
    })
    return () => { active = false }
  }, [path, route])

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
    setDetailPost((current) => current?.id === post.id ? { ...current, score: (current.score || 0) + next - previous } : current)
  }

  async function createComment(body, parentId = null) {
    const activePost = detailPost
    if (!requireUser() || !supabase || !activePost) return false
    setCommentError('')
    const { error } = await supabase.from('comments').insert({ post_id: activePost.id, author_id: user.id, parent_id: parentId, body: body.trim() })
    if (error) { setCommentError(error.message); return false }
    notify('Comment added.')
    const { data: refreshedComments } = await supabase.from('comments').select('id,created_at,updated_at,post_id,author_id,parent_id,body,score,is_deleted').eq('post_id', activePost.id).order('created_at', { ascending: true })
    setDetailComments(refreshedComments || [])
    setDetailPost((current) => current?.id === activePost.id ? { ...current, comment_count: (current.comment_count || 0) + 1 } : current)
    await loadData(user.id)
    return true
  }

  async function deleteComment(commentId) {
    if (!user || !supabase) return
    const { error } = await supabase.from('comments').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', commentId).eq('author_id', user.id)
    if (error) { setCommentError(error.message); return }
    setDetailComments((current) => current.map((comment) => comment.id === commentId ? { ...comment, is_deleted: true } : comment))
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
    setDetailComments((current) => current.map((comment) => comment.id === commentId ? { ...comment, score: (comment.score || 0) + next - previous } : comment))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="mobile-menu-button icon-button" type="button" onClick={() => setMobileMenu((open) => !open)} aria-label="Toggle navigation">☰</button>
          <button className="brand" type="button" onClick={() => navigate('/')} aria-label="reddit home"><span className="brand-mark">r</span><span>reddit</span></button>
          <form className="search-wrap" onSubmit={(event) => { event.preventDefault(); navigate(`/search?q=${encodeURIComponent(search.trim())}`) }}><span className="search-glyph" aria-hidden="true">⌕</span><input aria-label="Search posts and communities" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Reddit" /></form>
          <div className="topbar-actions">
            {user ? <><button className="button button-primary create-top" type="button" onClick={() => { setDialogError(''); setComposeOpen(true) }}><span>＋</span> Create</button><button className="account-button" type="button" onClick={handleSignOut} title="Sign out"><Avatar name={ownProfile?.username || user.email} small /><span className="account-name">{ownProfile?.username || user.email?.split('@')[0] || 'Account'}</span><span aria-hidden="true">⌄</span></button></> : <><button className="button button-quiet login-top" type="button" onClick={() => { setAuthError(''); setAuthMode('signin') }}>Log in</button><button className="button button-primary" type="button" onClick={() => { setAuthError(''); setAuthMode('signup') }}>Sign up</button></>}
          </div>
        </div>
      </header>

      <div className="layout"><aside className={`left-rail${mobileMenu ? ' is-open' : ''}`}><nav className="primary-nav" aria-label="Main navigation"><button className="nav-item" onClick={() => navigate('/')}>⌂ Home</button><button className="nav-item" onClick={() => navigate('/popular')}>↗ Popular</button><button className="nav-item" onClick={() => navigate('/saved')}>▣ Saved</button><button className="nav-item" onClick={() => { setCommunityOpen(true); setDialogError('') }}>＋ Create a community</button></nav><div className="rail-rule"/><div className="rail-heading">YOUR COMMUNITIES</div>{communities.map((c) => <button key={c.id} className="community-nav-item" onClick={() => navigate(`/r/${encodeURIComponent(c.name)}`)}><span className="community-badge">{c.name.slice(0,1).toUpperCase()}</span><span>r/{c.name}</span></button>)}</aside>
        <main className="feed-column">{dataError && <div className="notice notice-error" role="alert"><strong>Can’t load live data</strong><span>{dataError}</span><button className="text-button" onClick={() => loadData(user?.id || null)}>Try again</button></div>}{actionError && <div className="notice notice-error" role="alert"><span>{actionError}</span><button className="icon-button" onClick={() => setActionError('')} aria-label="Dismiss">×</button></div>}
          {route.parts[0] === 'search' ? <SearchPage query={route.url.searchParams.get('q') || ''} {...searchResults} loading={searchLoading} error={searchError} communityMap={communityMap} profileMap={profileMap} user={user} postVotes={postVotes} savedPostIds={savedPostIds} onVote={togglePostVote} onSave={toggleSave} onShare={sharePost} onNavigate={navigate} onJoin={toggleMembership} memberships={memberships} onEdit={editPost} onDelete={deletePost}/> : route.parts[0] === 'comments' ? <PostDetailPage post={detailPost} community={communityMap[detailPost?.community_id]} author={profileMap[detailPost?.author_id]} comments={detailComments} profileMap={profileMap} user={user} commentVotes={commentVotes} postVote={postVotes[detailPost?.id] || 0} saved={savedPostIds.includes(detailPost?.id)} loading={detailLoading} error={commentError} onPostVote={togglePostVote} onCommentVote={toggleCommentVote} onSave={toggleSave} onShare={sharePost} onNavigate={navigate} onReply={createComment} onDeleteComment={deleteComment} onEditPost={editPost} onDeletePost={deletePost} onOpenAuth={() => setAuthMode('signin')}/> : route.parts[0] === 'u' ? <ProfilePage profile={profilePage} posts={profilePosts} comments={profileComments} communityMap={communityMap} profileMap={profileMap} user={user} isFollowing={follows.includes(profilePage?.id)} loading={profileLoading} onFollow={toggleFollow} onNavigate={navigate} onVote={togglePostVote} postVotes={postVotes} savedPostIds={savedPostIds} onSave={toggleSave} onShare={sharePost} onEdit={editPost} onDelete={deletePost}/> : ['about','content-policy','privacy','rules','help'].includes(route.parts[0]) ? <StaticPage page={route.parts[0]}/> : <>
            <div className="feed-heading"><div><p className="eyebrow">{route.parts[0] === 'r' ? 'COMMUNITY' : route.parts[0] === 'saved' ? 'YOUR SAVED POSTS' : route.parts[0] === 'popular' ? 'TRENDING' : 'YOUR FRONT PAGE'}</p><h1>{route.parts[0] === 'r' ? `r/${route.parts[1]}` : route.parts[0] === 'saved' ? 'Saved posts' : route.parts[0] === 'popular' ? 'Popular posts' : 'Home'}</h1></div></div>
            <button className="composer-prompt" type="button" onClick={() => { if (requireUser()) setComposeOpen(true) }}><Avatar name={ownProfile?.username || user?.email || 'you'}/><span>Share something with the community</span></button><div className="sort-bar"><span>FEED</span><div className="sort-options">{['hot','new','top'].map((s) => <button key={s} className={sort === s ? 'sort-active' : ''} onClick={() => setSort(s)}>{s === 'hot' ? 'Hot' : s === 'new' ? 'New' : 'Top'}</button>)}</div></div>
            <section className="post-list" aria-label="Posts">{loading || (['r','saved'].includes(route.parts[0]) && routePostsLoading) ? <div className="loading-card"><span className="spinner"/>Loading posts…</div> : rankPosts(routePosts ?? posts, route.parts[0] === 'popular' ? 'top' : sort).map((post) => <PostCard key={post.id} post={post} community={communityMap[post.community_id]} author={profileMap[post.author_id]} user={user} vote={postVotes[post.id] || 0} saved={savedPostIds.includes(post.id)} onVote={togglePostVote} onSave={toggleSave} onShare={sharePost} onNavigate={navigate} onEdit={editPost} onDelete={deletePost}/>)}{!loading && !routePostsLoading && (routePosts ?? posts).length === 0 && <div className="empty-state"><h2>{route.parts[0] === 'saved' ? 'No saved posts' : 'No posts yet'}</h2><p>{route.parts[0] === 'saved' ? 'Save a post and it will appear here.' : 'Start a conversation in your community.'}</p></div>}</section>
          </>}
        </main></div><SiteFooter onNavigate={navigate}/>
      {notice && <div className="toast" role="status">{notice}</div>}
      {authMode && <AuthDialog mode={authMode} setMode={(mode) => { setAuthError(''); setAuthMode(mode) }} onClose={() => setAuthMode('')} onSubmit={handleAuth} busy={authBusy} error={authError} />}
      {composeOpen && <CreatePostDialog communities={communities} onClose={() => setComposeOpen(false)} onSubmit={createPost} busy={dialogBusy} error={dialogError} />}
      {communityOpen && <CommunityDialog onClose={() => setCommunityOpen(false)} onSubmit={createCommunity} busy={dialogBusy} error={dialogError} />}
    </div>
  )
}

export default App
