# OS Governance Platform

A comprehensive web-based interface for decentralized governance on Algorand, enabling users to create, vote on, and manage governance proposals.

## Features

### 🏠 Landing Page (`/governance`)
- **Hero Section**: Platform overview with call-to-action buttons
- **Quick Stats Dashboard**: Real-time statistics (total proposals, active proposals, total voters, participation rate)
- **Recent Proposals**: Preview of the latest 3 proposals with voting progress
- **Wallet Integration**: Connect wallet to access full functionality

### 📋 Proposals List (`/governance/proposals`)
- **Advanced Filtering**: Filter by status, date range, and search terms
- **Sorting Options**: Sort by newest, oldest, most votes, or least votes
- **Proposal Cards**: Rich cards showing proposal details, voting progress, and action buttons
- **Empty States**: Helpful messaging when no proposals match filters

### 📄 Proposal Detail (`/governance/proposals/:id`)
- **Comprehensive View**: Full proposal information with timeline
- **Voting Statistics**: Real-time vote counts and percentages
- **Vote History**: Table of all votes with voter addresses and reasons
- **Action Buttons**: Context-aware actions (vote, activate, execute)
- **Voting Modal**: Secure voting interface with confirmation

### ✏️ Create Proposal (`/governance/proposals/create`)
- **Form Validation**: Real-time validation with character limits
- **Live Preview**: See how your proposal will appear before submitting
- **Guidelines**: Helpful tips for creating effective proposals
- **Transaction Info**: Estimated fees and network information

### 📊 Dashboard (`/governance/dashboard`)
- **User Profile**: Voting power, participation rate, and activity stats
- **Quick Actions**: Access to common tasks and recent activity
- **My Proposals**: Table of proposals created by the user
- **My Votes**: History of all votes cast by the user
- **Activity Feed**: Recent governance actions and updates

### ⚙️ Admin Panel (`/governance/admin`)
- **Admin-Only Access**: Restricted to governance administrators
- **Pending Actions**: Manage proposals requiring finalization or execution
- **System Settings**: View and update governance parameters
- **Analytics**: System-wide statistics and activity monitoring

## Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: React hooks and context
- **Form Handling**: React Hook Form with Zod validation
- **Wallet Integration**: @txnlab/use-wallet-react for Algorand wallets
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Build Tool**: Vite

## Design System

### Color Scheme
- **Primary**: Blue (#3b82f6) for primary actions
- **Success**: Green (#22c55e) for positive outcomes
- **Warning**: Yellow (#eab308) for attention
- **Error**: Red (#ef4444) for critical issues
- **Muted**: Gray (#6b7280) for secondary text

### Components
All components use shadcn/ui with consistent styling:
- **Cards**: Content containers with headers and sections
- **Badges**: Status indicators with semantic colors
- **Buttons**: Multiple variants for different actions
- **Progress Bars**: Visual representation of voting progress
- **Tables**: Data display with sorting and filtering
- **Modals**: Overlay dialogs for actions and confirmations
- **Forms**: Validated input fields with real-time feedback

## User Experience

### Accessibility
- **WCAG 2.1 AA Compliance**: Proper contrast ratios and keyboard navigation
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Focus Management**: Visible focus indicators and logical tab order
- **Error Handling**: Clear error messages and recovery options

### Mobile Responsive
- **Responsive Design**: Optimized for all screen sizes
- **Touch-Friendly**: Large touch targets and gesture support
- **Progressive Enhancement**: Core functionality works without JavaScript

### Performance
- **Fast Loading**: Optimized bundle size and lazy loading
- **Real-time Updates**: Live data without page refreshes
- **Caching**: Intelligent caching of proposal data
- **Error Recovery**: Graceful handling of network issues

## Governance Workflow

### 1. Proposal Creation
1. User connects wallet
2. Navigates to "Create Proposal"
3. Fills out title (max 64 chars) and description (max 512 chars)
4. Reviews preview and submits
5. Transaction is signed and submitted to Algorand

### 2. Proposal Activation
1. Proposal enters "Pending" status
2. Voters with sufficient power can activate
3. Once activation threshold is met, proposal becomes "Active"
4. Voting period begins (7 days by default)

### 3. Voting Process
1. Users view active proposals
2. Click "Vote" to open voting modal
3. Select "For" or "Against"
4. Confirm vote and sign transaction
5. Vote is recorded on-chain

### 4. Proposal Finalization
1. Voting period ends
2. If quorum is met and majority is "For", proposal "Succeeds"
3. Admin can finalize successful proposals
4. Execution delay period begins (24 hours by default)

### 5. Proposal Execution
1. After execution delay, admin can execute proposal
2. Proposal actions are performed on-chain
3. Proposal status becomes "Executed"

## Status Definitions

- **Pending**: Proposal created, waiting for activation
- **Active**: Proposal is open for voting
- **Succeeded**: Voting ended with majority support and quorum met
- **Defeated**: Voting ended without majority support or quorum
- **Executed**: Proposal has been executed on-chain
- **Canceled**: Proposal was canceled by creator or admin
- **Expired**: Proposal expired without sufficient activation

## Integration Points

### Algorand Smart Contracts
The platform integrates with Algorand governance smart contracts:
- **Proposal Creation**: `create_proposal(title, description)`
- **Proposal Activation**: `activate_proposal(proposal_id)`
- **Voting**: `vote(proposal_id, support)`
- **Finalization**: `finalize_proposal(proposal_id)`
- **Execution**: `execute_proposal(proposal_id)`

### Wallet Support
- **Pera Wallet**: Native Algorand wallet
- **Defly**: Mobile-first wallet
- **Kibisis**: Browser extension wallet
- **Lute**: Hardware wallet support
- **WalletConnect**: Multi-wallet support

### Data Sources
- **On-chain Data**: Proposal states, votes, and governance parameters
- **Indexer API**: Historical data and analytics
- **Real-time Updates**: WebSocket connections for live data

## Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Algorand development environment
- Governance smart contracts deployed

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd build-love-buidl-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables
Create a `.env` file with:
```env
VITE_ALGOD_SERVER=https://mainnet-api.algonode.cloud
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=
VITE_INDEXER_SERVER=https://mainnet-idx.algonode.cloud
VITE_INDEXER_PORT=443
VITE_INDEXER_TOKEN=
VITE_GOVERNANCE_APP_ID=your_governance_app_id
VITE_GOVERNANCE_TOKEN_ID=your_governance_token_id
```

### Configuration
Update the governance contract addresses and parameters in:
- `src/constants/governance.ts` - Contract addresses and parameters
- `src/hooks/useGovernance.ts` - Contract interaction logic
- `src/utils/contracts.ts` - Smart contract calls

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Deployment

### Build
```bash
npm run build
```

### Deploy
```bash
npm run deploy
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation

## Roadmap

### Phase 1: Core Functionality ✅
- [x] Proposal viewing and voting
- [x] Proposal creation
- [x] Basic admin functions
- [x] Mobile responsiveness

### Phase 2: Advanced Features 🚧
- [ ] Real-time notifications
- [ ] Advanced analytics
- [ ] Proposal templates
- [ ] Multi-language support

### Phase 3: Ecosystem Integration 🚧
- [ ] Cross-chain governance
- [ ] DeFi protocol integration
- [ ] DAO framework support
- [ ] Advanced voting mechanisms

### Phase 4: Enterprise Features 🚧
- [ ] Role-based access control
- [ ] Audit logging
- [ ] Compliance reporting
- [ ] Enterprise SSO integration 