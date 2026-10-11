# Copilot Setup

## Setting Up GitHub Copilot for CalmAPI

To help GitHub Copilot understand CalmAPI's architecture and patterns, you need to provide it with custom instructions. This will enable Copilot to give you better, context-aware suggestions that follow CalmAPI conventions.

### Quick Setup Steps

1. **View the instructions file**: Open [copilot-instructions.md for 1.x](/v1/copilot-instructions.md) (opens the raw file)

2. **Save the file** to your CalmAPI project at this exact location:
   ```
   .github/copilot-instructions.md
   ```

3. **Create the `.github` folder** in your project root if it doesn't already exist:
   ```bash
   mkdir .github
   ```

4. **That's it!** Once the file is in place, GitHub Copilot will automatically use these instructions to:
   - Follow CalmAPI's Controller-Service-Model architecture
   - Generate proper DTOs with Object.freeze()
   - Use autoBind(this) in controllers correctly
   - Follow all CalmAPI best practices and patterns

### What the Instructions Include

The `copilot-instructions.md` file contains comprehensive guidance for GitHub Copilot about:

- CalmAPI's modular architecture and 6-file structure
- Complete templates for Models, Services, Controllers, DTOs, Routes, and Settings
- Critical rules (like autoBind, DTO merging, error handling)
- Common patterns for authentication, validation, and queries
- Common mistakes to avoid
- Built-in modules and their usage

With these instructions in place, Copilot will become your expert CalmAPI development assistant!
