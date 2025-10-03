import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Get the absolute path to the HTML file
        file_path = os.path.abspath('index.html')
        await page.goto(f"file://{file_path}")

        # 1. Create a new project
        await page.get_by_role("button", name="Create New Project").click()
        await page.get_by_label("Project Name:").fill("Test DXF Import Project")
        await page.get_by_role("button", name="Create Project").click()

        # Wait for the editor to load by checking for the project name display
        await expect(page.locator("#editor-view")).to_be_visible(timeout=10000)
        project_name_display = page.locator("#currentProjectNameDisplay")
        await expect(project_name_display).to_have_text("Test DXF Import Project", timeout=10000)

        # 2. The "Create" tab is active by default, so we proceed to find the button.
        # 3. Find the "Import DXF" button
        import_button = page.get_by_role("button", name="Import DXF")
        await expect(import_button).to_be_visible()

        # 4. Set the input file for the hidden file input
        file_input = page.locator("#dxfFileInput")
        await file_input.set_input_files("jules-scratch/verification/test.dxf")

        # 5. Wait for the imported object to appear in the scene explorer
        scene_explorer = page.locator("#objectList")
        # The imported object group will be named "test" from "test.dxf"
        await expect(scene_explorer.get_by_text("test", exact=True)).to_be_visible(timeout=15000)

        # 6. Take a screenshot to verify the visual output
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())