import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon, Languages, ArrowRight, BookOpen, Anchor, History, Shield } from 'lucide-react'
import { AmbientBackground } from '@/components/landing/AmbientBackground'
import { FadeIn } from '@/components/landing/FadeIn'
import { Logo } from '@/components/common/Logo'

type Language = 'zh' | 'en'

const CTA_NAV_ENABLED = false

const translations = {
  zh: {
    nav: {
      toggleTheme: "切换主题",
      toggleLang: "Switch to English"
    },
    hero: {
      title: "每个人，都应该有一个<br />可以和自己说话的地方。",
      subtitle: "SecondMe：一个只属于你自己的空间",
      scroll: "向下阅读"
    },
    sections: {
      origin: {
        label: "缘起 / ORIGIN",
        title: "为什么会有 SecondMe",
        content: [
          "每个人都会经历这样的时刻：看完一本书，却不知道该跟谁聊；听到一首歌，被触动了，却说不清原因；走过一段风景，心里有感受，却无处安放。",
          "有些情绪，不适合说给任何人听。<br/>有些想法，太零碎，也太私人。"
        ],
        quote: "我们并不是缺少表达的能力，<br/>而是缺少一个<strong>不会打断、不会评判、不会离开的空间</strong>。",
        conclusion: "SecondMe 正是为此而存在。"
      },
      define: {
        label: "定义 / DEFINE",
        title: "SecondMe 是什么",
        notThis: "它不是",
        isThis: "它是",
        notList: [
          "社交产品",
          "让你关注别人",
          "追求互动与热闹"
        ],
        isList: [
          "一个个人空间",
          "你可以慢慢说，反复说",
          "陪你记下走过的路"
        ],
        summary: "SecondMe 的角色，不是指导你该怎么做，而是<strong>时间没有断裂的陪伴</strong>。"
      },
      boundary: {
        label: "边界 / BOUNDARY",
        title: "我们不想做什么",
        intro: "在使用 SecondMe 之前，我们想先把一些事情说清楚。<br/>如果你期待的是：",
        tags: ["被激励", "被评估", "被对比", "被引导"],
        conclusion: "那 SecondMe 可能并不适合你。"
      },
      vision: {
        label: "愿景 / VISION",
        title: "随着时间推移，越来越像你",
        cards: [
          {
            title: "历史感",
            desc: "你反复提到的事情是什么？哪些想法，几年后你还会回来看？"
          },
          {
            title: "稳定性",
            desc: "哪些东西，对你来说是重要的，而不是流行的？"
          },
          {
            title: "了解",
            desc: "不是变得更聪明，而是变得更了解你的语气、你的在意。"
          }
        ]
      },
      privacy: {
        label: "隐私 / PRIVACY",
        title: "独立且私密",
        p1: "SecondMe 支持多用户，但并不意味着「多人空间」。",
        p2: "每一个人，都是在<strong>完全独立、互不干扰的空间里</strong>使用 SecondMe。没有公共时间线，没有比较，没有他人的目光。",
        p3: "我们只是提供这个空间本身，空间里发生的一切，永远只属于你。"
      }
    },
    footer: {
      title: "SecondMe<br/>并不试图改变你。",
      desc: "如果它真的有一点价值，那大概只是帮你更清楚地看见：你已经是谁，你正在成为谁。",
      cta: "进入你的空间",
      notice: "第二大脑空间正在打磨中，敬请期待。",
      copyright: "安静 · 记录 · 存在"
    }
  },
  en: {
    nav: {
      toggleTheme: "Toggle Theme",
      toggleLang: "切换到中文"
    },
    hero: {
      title: "Everyone deserves a place<br />to talk to themselves.",
      subtitle: "SecondMe: A space that belongs only to you",
      scroll: "SCROLL DOWN"
    },
    sections: {
      origin: {
        label: "ORIGIN",
        title: "Why SecondMe Exists",
        content: [
          "We all have moments like this: finishing a book with no one to share it with; being moved by a song without knowing why; walking through a landscape with feelings having nowhere to land.",
          "Some emotions aren't meant for others.<br/>Some thoughts are too fragmented, too private."
        ],
        quote: "It's not that we lack the ability to express,<br/>but rather a space that <strong>won't interrupt, won't judge, and won't leave</strong>.",
        conclusion: "This is why SecondMe exists."
      },
      define: {
        label: "DEFINE",
        title: "What is SecondMe",
        notThis: "Not This",
        isThis: "This",
        notList: [
          "A social product",
          "Following others",
          "Seeking interaction or buzz"
        ],
        isList: [
          "A personal space",
          "Speak slowly, speak repeatedly",
          "Record the path you've walked"
        ],
        summary: "SecondMe's role is not to guide you, but to provide <strong>unbroken companionship over time</strong>."
      },
      boundary: {
        label: "BOUNDARY",
        title: "What We Don't Do",
        intro: "Before using SecondMe, we want to be clear.<br/>If you are looking for:",
        tags: ["Motivation", "Evaluation", "Comparison", "Guidance"],
        conclusion: "Then SecondMe might not be for you."
      },
      vision: {
        label: "VISION",
        title: "More Like You Over Time",
        cards: [
          {
            title: "History",
            desc: "What do you mention repeatedly? Which thoughts will you revisit years later?"
          },
          {
            title: "Stability",
            desc: "What is important to you, rather than what is popular?"
          },
          {
            title: "Understanding",
            desc: "Not smarter, but more attuned to your tone and what you care about."
          }
        ]
      },
      privacy: {
        label: "PRIVACY",
        title: "Independent & Private",
        p1: "SecondMe supports multiple users, but it is not a \"multi-user space\".",
        p2: "Everyone uses SecondMe in a <strong>completely independent, undisturbed space</strong>. No public timelines, no comparison, no gaze from others.",
        p3: "We only provide the space itself. Everything that happens inside belongs only to you."
      }
    },
    footer: {
      title: "SecondMe<br/>Doesn't Try to Change You.",
      desc: "If it has any value, it is perhaps just to help you see more clearly: who you already are, and who you are becoming.",
      cta: "Enter Your Space",
      notice: "We’re crafting this private space right now — stay tuned.",
      copyright: "QUIET · RECORD · EXIST"
    }
  }
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [lang, setLang] = useState<Language>('zh')
  const [ctaNoticeVisible, setCtaNoticeVisible] = useState(false)
  const ctaNoticeTimer = useRef<number | null>(null)

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as Language
    if (savedLang && (savedLang === 'zh' || savedLang === 'en')) {
      setLang(savedLang)
    }
  }, [])

  const toggleLang = () => {
    const newLang = lang === 'zh' ? 'en' : 'zh'
    setLang(newLang)
    localStorage.setItem('lang', newLang)
  }

  useEffect(() => {
    return () => {
      if (ctaNoticeTimer.current) {
        window.clearTimeout(ctaNoticeTimer.current)
      }
    }
  }, [])

  const handleCTA = () => {
    setCtaNoticeVisible(true)
    if (ctaNoticeTimer.current) {
      window.clearTimeout(ctaNoticeTimer.current)
    }
    ctaNoticeTimer.current = window.setTimeout(() => {
      setCtaNoticeVisible(false)
    }, 4000)

    if (CTA_NAV_ENABLED) {
      if (user) {
        navigate('/app')
      } else {
        navigate('/login')
      }
    }
  }

  const t = translations[lang]

  return (
    <div className="min-h-screen bg-paper dark:bg-darkPaper text-ink dark:text-darkInk transition-colors duration-500 relative overflow-x-hidden selection:bg-accent/20 dark:selection:bg-darkAccent/20">

      <AmbientBackground />

      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 bg-noise pointer-events-none z-50 mix-blend-multiply dark:mix-blend-soft-light opacity-100 dark:opacity-20"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full p-6 md:p-12 z-[60] flex justify-between items-center mix-blend-difference md:mix-blend-normal">
        <Logo />
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLang}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-ink/5 dark:hover:bg-white/5 transition-colors duration-300 focus:outline-none text-sm font-medium opacity-80 hover:opacity-100"
            aria-label={t.nav.toggleLang}
          >
            <Languages className="w-4 h-4" />
            <span className="font-serif pt-0.5">{lang === 'zh' ? 'En' : '中'}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-ink/5 dark:hover:bg-white/5 transition-colors duration-300 focus:outline-none"
            aria-label={t.nav.toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-darkInk/70" strokeWidth={1.5} />
            ) : (
              <Moon className="w-5 h-5 text-ink/70" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="min-h-screen flex flex-col justify-center items-center px-6 md:px-24 relative z-10">
        <div className="max-w-3xl text-center relative">

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] -z-10 pointer-events-none opacity-40 dark:opacity-20">
             <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
               <path fill="none" stroke="currentColor" strokeWidth="0.5" className="text-accent dark:text-darkAccent" d="M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0" strokeDasharray="4 4">
                 <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="120s" repeatCount="indefinite"/>
               </path>
             </svg>
          </div>

          <FadeIn delay={200}>
            <h1
              className="font-serif text-3xl md:text-5xl lg:text-6xl leading-tight font-light text-ink/90 dark:text-darkInk/90 mb-8 md:mb-12"
              dangerouslySetInnerHTML={{ __html: t.hero.title }}
            />
          </FadeIn>

          <FadeIn delay={800}>
            <p className="text-subInk dark:text-darkSubInk font-serif text-base md:text-xl tracking-wide opacity-80">
              {t.hero.subtitle}
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={1500} className="absolute bottom-12 text-muted dark:text-muted/60 text-xs md:text-sm animate-pulse tracking-widest">
          {t.hero.scroll}
        </FadeIn>
      </header>

      <main className="max-w-4xl mx-auto px-6 md:px-12 pb-32 relative z-10">

        {/* Section 1: Origin */}
        <section className="py-20 md:py-32 border-t border-muted/10 dark:border-white/5 relative">
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-4 text-accent dark:text-darkAccent font-serif text-xs md:text-sm tracking-widest uppercase mt-2 opacity-60">
                {t.sections.origin.label}
              </div>
              <div className="md:col-span-8 space-y-6 md:space-y-8">
                <h2 className="font-serif text-2xl md:text-3xl text-ink dark:text-darkInk">{t.sections.origin.title}</h2>
                <div className="text-subInk dark:text-darkSubInk font-light leading-relaxed md:leading-loose space-y-6 text-base md:text-lg">
                  <p dangerouslySetInnerHTML={{ __html: t.sections.origin.content[0] }} />
                  <p dangerouslySetInnerHTML={{ __html: t.sections.origin.content[1] }} />
                  <blockquote className="border-l-2 border-accent/30 dark:border-darkAccent/30 pl-6 italic my-8 text-ink/80 dark:text-darkInk/80 relative">
                    <span dangerouslySetInnerHTML={{ __html: t.sections.origin.quote }} />
                  </blockquote>
                  <p>{t.sections.origin.conclusion}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Section 2: Define */}
        <section className="py-20 md:py-32 border-t border-muted/10 dark:border-white/5">
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-4 text-accent dark:text-darkAccent font-serif text-xs md:text-sm tracking-widest uppercase mt-2 opacity-60">
                {t.sections.define.label}
              </div>
              <div className="md:col-span-8">
                <h2 className="font-serif text-2xl md:text-3xl mb-8 md:mb-12 text-ink dark:text-darkInk">{t.sections.define.title}</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 md:gap-12">
                  <div className="space-y-4">
                    <h3 className="font-serif text-sm md:text-lg text-ink/40 dark:text-darkInk/30 border-b border-muted/20 dark:border-white/10 pb-2 uppercase tracking-widest">{t.sections.define.notThis}</h3>
                    <ul className="space-y-3 text-subInk/80 dark:text-darkSubInk/60 font-light text-sm md:text-base">
                      {t.sections.define.notList.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-muted dark:text-muted/60 leading-none">×</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4 relative">
                    <h3 className="font-serif text-sm md:text-lg text-accent dark:text-darkAccent border-b border-muted/20 dark:border-white/10 pb-2 uppercase tracking-widest">{t.sections.define.isThis}</h3>
                    <ul className="space-y-3 text-ink dark:text-darkInk font-normal text-sm md:text-base">
                      {t.sections.define.isList.map((item, i) => (
                         <li key={i} className="flex items-start gap-3">
                           <span className="text-accent dark:text-darkAccent leading-none">●</span> {item}
                         </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div
                  className="mt-12 text-subInk dark:text-darkSubInk font-light leading-relaxed text-sm md:text-base italic opacity-80"
                  dangerouslySetInnerHTML={{ __html: t.sections.define.summary }}
                />
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Section 3: Boundary */}
        <section className="py-20 md:py-32 border-t border-muted/10 dark:border-white/5">
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-4 text-accent dark:text-darkAccent font-serif text-xs md:text-sm tracking-widest uppercase mt-2 opacity-60">
                {t.sections.boundary.label}
              </div>
              <div className="md:col-span-8 space-y-6 md:space-y-8">
                <h2 className="font-serif text-2xl md:text-3xl text-ink dark:text-darkInk">{t.sections.boundary.title}</h2>
                <div className="bg-white/40 dark:bg-white/5 p-6 md:p-10 rounded-sm border border-muted/10 dark:border-white/10 backdrop-blur-sm">
                  <p className="text-subInk dark:text-darkSubInk leading-relaxed md:leading-loose mb-6 text-sm md:text-base" dangerouslySetInnerHTML={{__html: t.sections.boundary.intro}} />
                  <div className="flex flex-wrap gap-2 md:gap-3 mb-8">
                     {t.sections.boundary.tags.map((tag) => (
                       <span key={tag} className="px-3 py-1 bg-muted/5 dark:bg-white/5 text-muted dark:text-darkSubInk/70 text-xs md:text-sm rounded-full border border-muted/10 dark:border-white/5">{tag}</span>
                     ))}
                  </div>
                  <p className="text-ink dark:text-darkInk font-serif text-base md:text-lg">
                    {t.sections.boundary.conclusion}
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Section 4: Vision */}
        <section className="py-20 md:py-32 border-t border-muted/10 dark:border-white/5">
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-4 text-accent dark:text-darkAccent font-serif text-xs md:text-sm tracking-widest uppercase mt-2 opacity-60">
                {t.sections.vision.label}
              </div>
              <div className="md:col-span-8 space-y-10 md:space-y-12">
                <h2 className="font-serif text-2xl md:text-3xl text-ink dark:text-darkInk">{t.sections.vision.title}</h2>

                <div className="grid grid-cols-1 gap-8 md:gap-10">
                  <div className="flex gap-4 group">
                    <div className="mt-1 transition-transform duration-500 group-hover:scale-110">
                      <History className="w-5 h-5 md:w-6 md:h-6 text-accent dark:text-darkAccent shrink-0" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg text-ink dark:text-darkInk mb-2">{t.sections.vision.cards[0].title}</h3>
                      <p className="text-subInk dark:text-darkSubInk font-light text-sm md:text-base">{t.sections.vision.cards[0].desc}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 group">
                    <div className="mt-1 transition-transform duration-500 group-hover:scale-110">
                      <Anchor className="w-5 h-5 md:w-6 md:h-6 text-accent dark:text-darkAccent shrink-0" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg text-ink dark:text-darkInk mb-2">{t.sections.vision.cards[1].title}</h3>
                      <p className="text-subInk dark:text-darkSubInk font-light text-sm md:text-base">{t.sections.vision.cards[1].desc}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 group">
                    <div className="mt-1 transition-transform duration-500 group-hover:scale-110">
                      <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-accent dark:text-darkAccent shrink-0" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg text-ink dark:text-darkInk mb-2">{t.sections.vision.cards[2].title}</h3>
                      <p className="text-subInk dark:text-darkSubInk font-light text-sm md:text-base">{t.sections.vision.cards[2].desc}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Section 5: Privacy */}
        <section className="py-20 md:py-32 border-t border-muted/10 dark:border-white/5">
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-4 text-accent dark:text-darkAccent font-serif text-xs md:text-sm tracking-widest uppercase mt-2 opacity-60">
                {t.sections.privacy.label}
              </div>
              <div className="md:col-span-8">
                 <div className="flex items-start gap-4 mb-6">
                    <Shield className="w-5 h-5 md:w-6 md:h-6 text-ink/40 dark:text-darkInk/40 mt-1" strokeWidth={1.5} />
                    <h2 className="font-serif text-2xl md:text-3xl text-ink dark:text-darkInk">{t.sections.privacy.title}</h2>
                 </div>
                <div className="text-subInk dark:text-darkSubInk font-light leading-relaxed md:leading-loose text-sm md:text-lg space-y-4">
                  <p>{t.sections.privacy.p1}</p>
                  <p dangerouslySetInnerHTML={{__html: t.sections.privacy.p2}} />
                  <p className="text-ink dark:text-darkInk pt-2">{t.sections.privacy.p3}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Footer */}
        <footer className="py-24 md:py-32 mt-12 border-t border-muted/10 dark:border-white/5 text-center relative overflow-hidden">
          <FadeIn>
            <h2
              className="font-serif text-2xl md:text-4xl text-ink dark:text-darkInk mb-6 md:mb-8 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t.footer.title }}
            />
            <p className="text-subInk dark:text-darkSubInk mb-10 md:mb-12 font-light max-w-md mx-auto px-4 text-sm md:text-base">
              {t.footer.desc}
            </p>

            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-3 px-8 py-4 border border-ink/10 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-paperDark dark:hover:bg-white/10 transition-all duration-500 rounded-sm text-ink dark:text-darkInk group text-sm md:text-base shadow-sm relative z-10"
            >
              <span className="font-serif tracking-wide">{t.footer.cta}</span>
              <ArrowRight className="w-4 h-4 text-muted dark:text-muted/60 group-hover:text-accent dark:group-hover:text-darkAccent transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <div className="mt-6 w-full flex justify-center">
              <div
                aria-hidden={!ctaNoticeVisible}
                className={`flex max-w-md items-center gap-3 rounded-sm border border-white/40 dark:border-white/10 bg-white/70 dark:bg-darkPaper/60 px-4 py-3 text-xs md:text-sm text-ink/80 dark:text-darkInk/90 tracking-wide uppercase transition-all duration-500 ease-out ${
                  ctaNoticeVisible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-4'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-accent dark:bg-darkAccent animate-pulse" />
                {t.footer.notice}
              </div>
            </div>

            <div className="mt-20 md:mt-24 text-muted/30 dark:text-muted/15 text-[10px] md:text-xs tracking-[0.3em] uppercase">
              {t.footer.copyright}
            </div>
          </FadeIn>
        </footer>

      </main>
    </div>
  )
}
