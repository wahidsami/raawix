import { ReactNode } from 'react';
interface Tab {
    id: string;
    label: string;
    content: ReactNode;
}
interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
    ariaLabel?: string;
}
declare function Tabs({ tabs, defaultTab, ariaLabel }: TabsProps): import("react").JSX.Element;
export default Tabs;
//# sourceMappingURL=Tabs.d.ts.map