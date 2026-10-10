import { Link } from 'react-router-dom';
function Breadcrumbs({ items }) {
    return (<nav aria-label="Breadcrumb">
      <ol className="breadcrumbs">
        {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (<li key={index}>
              {isLast ? (<span aria-current="page">{item.label}</span>) : (<Link to={item.path || '#'}>{item.label}</Link>)}
            </li>);
        })}
      </ol>
    </nav>);
}
export default Breadcrumbs;
//# sourceMappingURL=Breadcrumbs.js.map