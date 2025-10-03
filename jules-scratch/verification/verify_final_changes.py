import asyncio
from playwright.async_api import async_playwright, ConsoleMessage
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        def print_console_message(msg: ConsoleMessage):
            print(f"Browser Console ({msg.type}): {msg.text}")

        page.on("console", print_console_message)

        await page.goto('http://localhost:8000')

        try:
            await page.wait_for_selector('#app-container', state='visible', timeout=10000)
            print("Verification successful: #app-container is visible.")
            await page.screenshot(path='jules-scratch/verification/final_verification.png')
        except Exception as e:
            print(f"Verification failed: {e}")
            await page.screenshot(path='jules-scratch/verification/final_verification_failed.png')
        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())