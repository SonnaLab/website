import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

export default function ResearchSection() {
  const researchAreas = [
    {
      title: "Intelligence Artificielle",
      description: "Développement d'algorithmes d'IA avancés pour optimiser les processus métier",
      technologies: ["Machine Learning", "Deep Learning", "NLP"],
      status: "En cours"
    },
    {
      title: "Blockchain & Web3",
      description: "Exploration des technologies décentralisées pour la sécurité des données",
      technologies: ["Ethereum", "Smart Contracts", "DeFi"],
      status: "Recherche"
    },
    {
      title: "Cloud Computing",
      description: "Innovation dans les architectures cloud natives et serverless",
      technologies: ["Kubernetes", "Microservices", "Edge Computing"],
      status: "Développement"
    },
    {
      title: "Cybersécurité",
      description: "Recherche en sécurité informatique et protection des données",
      technologies: ["Zero Trust", "Cryptographie", "Threat Detection"],
      status: "En cours"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "En cours": return "bg-green-100 text-green-800";
      case "Recherche": return "bg-blue-100 text-blue-800";
      case "Développement": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Recherche & Développement
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Notre laboratoire d'innovation explore les technologies émergentes 
            pour créer les solutions de demain
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {researchAreas.map((area, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-xl">{area.title}</CardTitle>
                  <Badge className={getStatusColor(area.status)}>
                    {area.status}
                  </Badge>
                </div>
                <p className="text-gray-600">{area.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {area.technologies.map((tech, techIndex) => (
                    <Badge key={techIndex} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <div className="bg-white rounded-lg p-8 shadow-sm border">
            <h3 className="text-2xl font-semibold mb-4">Partenariats R&D</h3>
            <p className="text-gray-600 mb-6">
              Nous collaborons avec des universités et centres de recherche 
              pour accélérer l'innovation technologique
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="secondary" className="px-4 py-2">Universités partenaires</Badge>
              <Badge variant="secondary" className="px-4 py-2">Labs d'innovation</Badge>
              <Badge variant="secondary" className="px-4 py-2">Startups tech</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}