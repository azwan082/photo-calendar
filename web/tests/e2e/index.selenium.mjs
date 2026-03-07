import { spawn } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const host = process.env.E2E_HOST ?? '0.0.0.0'
const port = Number(process.env.E2E_PORT ?? '4173')
const baseUrl = process.env.E2E_BASE_URL ?? `http://${host}:${port}`
const seleniumRemoteUrl = process.env.SELENIUM_REMOTE_URL ?? 'http://geckodriver:4444'
const browserHost = process.env.E2E_BROWSER_HOST ?? (seleniumRemoteUrl.includes('geckodriver') ? 'workspace' : host)
const browserBaseUrl = process.env.E2E_BROWSER_BASE_URL ?? `http://${browserHost}:${port}`
const startServer = process.env.E2E_START_SERVER !== '0'
const webRootPath = fileURLToPath(new URL('../../', import.meta.url))

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForHttpReady(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Wait for dev server to come up.
    }

    await delay(750)
  }

  throw new Error(`Timed out waiting for server at ${url}`)
}

async function runIndexPageTest() {
  const selenium = await import('selenium-webdriver')
  const firefox = await import('selenium-webdriver/firefox.js')
  const { Builder, By, until } = selenium

  const options = new firefox.Options()
  options.addArguments('-headless')

  const driver = await new Builder().usingServer(seleniumRemoteUrl).forBrowser('firefox').setFirefoxOptions(options).build()

  try {
    await driver.get(browserBaseUrl)

    const heading = await driver.wait(until.elementLocated(By.css('main h1')), 10_000)
    await driver.wait(until.elementTextContains(heading, 'Photo Calendar'), 10_000)

    const headingText = await heading.getText()
    if (headingText !== 'Photo Calendar') {
      throw new Error(`Unexpected heading text: "${headingText}"`)
    }

    const paragraph = await driver.findElement(By.css('main p'))
    const paragraphText = await paragraph.getText()

    if (!paragraphText.includes('Nuxt scaffold is ready.')) {
      throw new Error('Index page intro text is missing expected content')
    }

    const isMainVisible = await driver.findElement(By.css('main')).isDisplayed()
    if (!isMainVisible) {
      throw new Error('Main container is not visible')
    }

    console.log('Selenium e2e passed: index page renders expected content.')
  } finally {
    await driver.quit()
  }
}

async function runIndexPageHttpFallbackTest() {
  const response = await fetch(baseUrl)
  if (!response.ok) {
    throw new Error(`Fallback HTTP check failed: unexpected status ${response.status}`)
  }

  const html = await response.text()
  if (!html.includes('Photo Calendar')) {
    throw new Error('Fallback HTTP check failed: heading is missing')
  }

  if (!html.includes('Nuxt scaffold is ready.')) {
    throw new Error('Fallback HTTP check failed: intro text is missing')
  }

  console.log('HTTP fallback e2e passed: index page renders expected content.')
}

function isSeleniumNetworkError(error) {
  const message = String(error)
  return (
    message.includes('about:neterror') ||
    message.includes('connectionFailure') ||
    message.includes('dnsNotFound')
  )
}

async function main() {
  let devServer

  try {
    await waitForHttpReady(`${seleniumRemoteUrl.replace(/\/$/, '')}/status`)

    if (startServer) {
      devServer = spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port)], {
        cwd: webRootPath,
        stdio: 'inherit'
      })

      await waitForHttpReady(baseUrl)
    }

    try {
      await runIndexPageTest()
    } catch (error) {
      console.error('runIndexPageTest failed:', error)
      if (!isSeleniumNetworkError(error)) {
        throw error
      }

      console.warn(
        'Selenium browser cannot reach the app host in this environment. Falling back to HTTP page assertions.'
      )
      await runIndexPageHttpFallbackTest()
    }
  } finally {
    if (devServer && !devServer.killed) {
      devServer.kill('SIGTERM')
      await delay(500)
      if (!devServer.killed) {
        devServer.kill('SIGKILL')
      }
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
