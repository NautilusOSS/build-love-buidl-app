# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/f71e432c-7332-47bc-ae44-4812722b3fc5

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/f71e432c-7332-47bc-ae44-4812722b3fc5) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Feature Flags

This application uses a comprehensive feature flag system to control the availability of different features. Feature flags can be controlled via environment variables.

### Available Transfer Features

The application includes feature flags for transfer functionality:

- **Internal Transfers**: Transfers between different buckets/tokens within your own wallet
- **External Transfers**: Transfers to external addresses/recipients

### Environment Variables

To control transfer features, set these environment variables:

```env
# Enable/disable all transfer features
VITE_FEATURE_TRANSFER_ENABLED=true

# Enable/disable internal transfers
VITE_FEATURE_TRANSFER_INTERNAL=true

# Enable/disable external transfers
VITE_FEATURE_TRANSFER_EXTERNAL=true
```

### Usage in Code

```tsx
import { useFeatureFlags } from '@/constants/featureFlags';

const MyComponent = () => {
  const { 
    isTransferEnabled,
    isInternalTransferEnabled,
    isExternalTransferEnabled 
  } = useFeatureFlags();

  return (
    <div>
      {isInternalTransferEnabled() && <button>Internal Transfer</button>}
      {isExternalTransferEnabled() && <button>External Transfer</button>}
    </div>
  );
};
```

For more detailed information about all available feature flags, see [FEATURE_FLAGS.md](./FEATURE_FLAGS.md).

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/f71e432c-7332-47bc-ae44-4812722b3fc5) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
