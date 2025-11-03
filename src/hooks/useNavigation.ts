import { useNavigate, useLocation } from 'react-router-dom';

export function useNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigationClick = (href: string, section: string | null) => (e: React.MouseEvent) => {
    e.preventDefault();

    if (section) {
      if (location.pathname === '/') {
        const element = document.getElementById(section);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        navigate('/');
        setTimeout(() => {
          const element = document.getElementById(section);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    } else {
      navigate(href);
    }
  };

  return { handleNavigationClick };
}