import { useState } from 'react';
function Tabs({ tabs, defaultTab, ariaLabel = 'Tabs' }) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
    return (<div className="tabs" role="tablist" aria-label={ariaLabel}>
      <div className="tabs-header">
        {tabs.map((tab) => (<button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`tabpanel-${tab.id}`} id={`tab-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? 'active' : ''}>
            {tab.label}
          </button>))}
      </div>
      {tabs.map((tab) => (<div key={tab.id} role="tabpanel" id={`tabpanel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={activeTab !== tab.id}>
          {tab.content}
        </div>))}
    </div>);
}
export default Tabs;
//# sourceMappingURL=Tabs.js.map