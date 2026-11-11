const PAGES = {
  about: {
    eyebrow: 'ABOUT THIS COMMUNITY',
    title: 'A place for every conversation.',
    intro: 'This community app brings people together around the things they care about.',
    sections: [
      ['Find your people', 'Explore communities, join the ones that interest you, and follow people whose posts you enjoy.'],
      ['Take part', 'Share text, links, and images. Vote on posts and comments, reply to a discussion, and help good conversations rise.'],
      ['Built around your communities', 'Each community is created and shaped by its members. Keep discussions useful, curious, and welcoming.'],
    ],
  },
  'content-policy': {
    eyebrow: 'POLICY',
    title: 'Content policy',
    intro: 'Use the app in ways that respect other people and the communities they build.',
    sections: [
      ['Be respectful', 'Do not harass, threaten, or target people. Disagree with ideas without attacking the person.'],
      ['Share responsibly', 'Only post material you have the right to share. Do not post private information, impersonate others, or mislead people.'],
      ['Keep communities useful', 'Follow each community’s purpose and local rules. Mark adult or spoiler content with the available labels.'],
      ['Report problems', 'This prototype does not yet include a reporting workflow. Contact the site owner to flag harmful content.'],
    ],
  },
  privacy: {
    eyebrow: 'POLICY',
    title: 'Privacy',
    intro: 'This page summarizes what this prototype stores. It is not a substitute for a complete legal privacy notice.',
    sections: [
      ['Account information', 'Supabase Auth handles your sign-in email and password. The app stores your chosen username and public profile counters in Supabase.'],
      ['Public contributions', 'Posts, comments, votes, communities, and follow or membership records are stored in the project database. Posts, comments, communities, and public profile details can be shown to other visitors.'],
      ['Browser storage', 'Saved posts are kept in this browser’s local storage. They do not sync to another device or browser.'],
      ['Do not post secrets', 'Do not put passwords, payment details, or other sensitive personal information in a post or comment.'],
    ],
  },
  rules: {
    eyebrow: 'COMMUNITY',
    title: 'Community rules',
    intro: 'A few shared expectations help conversations stay worth joining.',
    sections: [
      ['Keep it civil', 'Be kind, argue in good faith, and avoid personal attacks.'],
      ['Stay on topic', 'Post in a community that fits the conversation and follow its description.'],
      ['No spam or impersonation', 'Do not flood discussions, misrepresent who you are, or post deceptive links.'],
      ['Respect privacy and copyright', 'Do not expose someone’s private information or share material you do not have rights to use.'],
    ],
  },
  help: {
    eyebrow: 'HELP CENTER',
    title: 'How can we help?',
    intro: 'Quick answers for using the community app.',
    sections: [
      ['Create a post', 'Sign in, choose a community, select Text, Link, or Image, add a title, and publish.'],
      ['Join a community', 'Open a community and select Join. Your joined communities appear in the left navigation.'],
      ['Vote or comment', 'Sign in first. Use the arrows to vote, open a post to read the thread, and reply below a comment to continue the conversation.'],
      ['Account help', 'Use Log in to access an existing account. Contact the site owner if you cannot access your account.'],
    ],
  },
}

export function StaticPage({ page = 'about' }) {
  const content = PAGES[page] || PAGES.about
  return <main className="static-page"><div className="static-page-hero"><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p>{content.intro}</p></div><div className="static-page-sections">{content.sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}</div><p className="static-page-note">This is a community app prototype. Site owners should review and customize these pages before inviting the public.</p></main>
}

export function SiteFooter({ onNavigate }) {
  const links = [
    ['About', '/about'],
    ['Content policy', '/content-policy'],
    ['Community rules', '/rules'],
    ['Privacy', '/privacy'],
    ['Help', '/help'],
  ]
  return <footer className="site-footer"><div className="site-footer-inner"><a className="footer-brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate('/') }}><span className="brand-mark">r</span><span>reddit</span></a><nav aria-label="Footer navigation">{links.map(([label, path]) => <a href={path} key={path} onClick={(event) => { event.preventDefault(); onNavigate(path) }}>{label}</a>)}</nav><small>© {new Date().getFullYear()} Reddit-inspired community</small></div></footer>
}
