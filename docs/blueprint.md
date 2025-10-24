# **App Name**: Vicky Medical POS

## Core Features:

- Inventory Display & Management: Display a table of medicines with details, and allow adding, editing, and deleting medicines.
- Category Based Medicine Forms: Present dynamic forms based on whether the user selects tablet, etc. for their medicines.
- POS Interface: Searchable medicine selection, billing table, customer name input, and complete sale functionality with automatic inventory update.
- Sales History: Display a list of past sales using an accordion component, with details and export to CSV functionality.
- Local Storage Persistence: Store and retrieve application data (medicines and sales) from localStorage.
- PWA Support: Make the app fully installable as a Progressive Web App and work offline via next-pwa.
- Expiry Check Tool: A tool that leverages past sales data and expiration dates to predict which medicines should be prioritized. Will output an alert message when nearly-expired drugs are detected based on LLM-augmented business rules.

## Style Guidelines:

- Primary color: A calming blue (#64B5F6) to inspire confidence and health.
- Background color: Light blue-gray (#ECEFF1) to create a clean and professional backdrop.
- Accent color: A warm orange (#FFAB40) to highlight important actions and information.
- Body font: 'PT Sans', a modern, humanist sans-serif that balances modernity and approachability; good for body text. Headline font: 'Space Grotesk', to give a feeling that the design has modern elements
- Code font: 'Source Code Pro' for displaying code snippets.
- Use clear and recognizable icons from ShadCN UI's available icon set for categories, actions, and status indicators.
- Implement responsive grid layouts with Tailwind CSS to adapt to different screen sizes, stacking vertically on mobile devices.
- Subtle animations and transitions for loading states, form interactions, and data updates to enhance the user experience.