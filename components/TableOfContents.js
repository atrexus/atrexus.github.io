import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'

function useArticleHeadings(isPost) {
  const router = useRouter()
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!isPost) {
      setItems([])
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const headings = Array.from(
        document.querySelectorAll('article h2, article h3, article h4')
      ).map((heading) => {
        const anchor = heading.querySelector('span[id]')

        return {
          depth: Number(heading.tagName.slice(1)),
          id: anchor?.id || heading.id,
          title: heading.textContent.trim()
        }
      }).filter((heading) => heading.id && heading.title)

      setItems(headings)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isPost, router.asPath])

  return items
}

function useActiveHeading(items) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    if (!items.length) {
      setActiveId('')
      return
    }

    const updateActiveHeading = () => {
      let currentId = items[0].id

      for (const item of items) {
        const heading = document.getElementById(item.id)
        if (!heading) continue

        if (heading.getBoundingClientRect().top <= 140) {
          currentId = item.id
        }
      }

      setActiveId(currentId)
    }

    updateActiveHeading()
    window.addEventListener('scroll', updateActiveHeading, { passive: true })
    window.addEventListener('resize', updateActiveHeading)

    return () => {
      window.removeEventListener('scroll', updateActiveHeading)
      window.removeEventListener('resize', updateActiveHeading)
    }
  }, [items])

  return activeId
}

function useMobileTocTarget(isPost) {
  const router = useRouter()
  const [target, setTarget] = useState(null)

  useEffect(() => {
    if (!isPost) {
      setTarget(null)
      return
    }

    let mount
    const frame = window.requestAnimationFrame(() => {
      const meta = document.querySelector('article h1 + div')
      if (!meta) return

      mount = document.createElement('div')
      mount.className = 'blog-toc-mobile-slot'
      meta.insertAdjacentElement('afterend', mount)
      setTarget(mount)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      mount?.remove()
      setTarget(null)
    }
  }, [isPost, router.asPath])

  return target
}

function TocList({ activeId, items, onNavigate }) {
  return (
    <ol className="blog-toc-list">
      {items.map((item) => (
        <li
          className={`blog-toc-item blog-toc-depth-${item.depth}`}
          key={item.id}
        >
          <a
            aria-current={activeId === item.id ? 'location' : undefined}
            href={`#${item.id}`}
            onClick={onNavigate}
          >
            {item.title}
          </a>
        </li>
      ))}
    </ol>
  )
}

export default function TableOfContents() {
  const router = useRouter()
  const isPost = router.asPath.split('#')[0].startsWith('/posts/')
  const items = useArticleHeadings(isPost)
  const activeId = useActiveHeading(items)
  const mobileTocTarget = useMobileTocTarget(isPost)

  if (!isPost || items.length < 2) {
    return null
  }

  const closeMobileToc = () => {
    document.querySelector('.blog-toc-mobile')?.removeAttribute('open')
  }

  const mobileToc = (
    <details className="blog-toc-mobile">
      <summary>
        <span>On this page</span>
        <span>{items.length} sections</span>
      </summary>
      <nav aria-label="Table of contents">
        <TocList
          activeId={activeId}
          items={items}
          onNavigate={closeMobileToc}
        />
      </nav>
    </details>
  )

  return (
    <>
      <nav className="blog-toc-desktop" aria-label="Table of contents">
        <p className="blog-toc-title">On this page</p>
        <TocList activeId={activeId} items={items} />
      </nav>
      {mobileTocTarget ? createPortal(mobileToc, mobileTocTarget) : null}
    </>
  )
}
