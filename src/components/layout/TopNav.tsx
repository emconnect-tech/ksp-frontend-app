import { Bell, Search } from 'lucide-react';

type TopNavProps = {
  title: string;
};

export const TopNav = ({ title }: TopNavProps) => {
  return (
    <header className="top-nav">
      <div className="top-nav-content">
        <h1 className="page-title">{title}</h1>
        <div className="top-nav-actions">
          <button className="icon-btn">
            <Search size={22} />
          </button>
          <button className="icon-btn">
            <Bell size={22} />
          </button>
          <div className="avatar">A</div>
        </div>
      </div>
    </header>
  );
};
