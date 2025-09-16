import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Brain, Shield, Cloud, Blocks, University, FlaskConical, Rocket } from "lucide-react";

export default function ResearchSection() {
  const researchAreas = [
    {
      title: "Intelligence Artificielle",
      description: "Développement d'algorithmes d'IA avancés pour optimiser les processus métier et automatiser les tâches complexes",
      technologies: ["Machine Learning", "Deep Learning", "NLP"],
      status: "En cours",
      icon: Brain,
      color: "text-blue-600"
    },
    {
      title: "Blockchain & Web3",
      description: "Exploration des technologies décentralisées pour la sécurité des données et les transactions transparentes",
      technologies: ["Ethereum", "Smart Contracts", "DeFi"],
      status: "Recherche",
      icon: Blocks,
      color: "text-purple-600"
    },
    {
      title: "Cloud Computing",
      description: "Innovation dans les architectures cloud natives, serverless et edge computing pour des performances optimales",
      technologies: ["Kubernetes", "Microservices", "Edge Computing"],
      status: "Développement",
      icon: Cloud,
      color: "text-cyan-600"
    },
    {
      title: "Cybersécurité",
      description: "Recherche en sécurité informatique avancée et protection proactive des infrastructures numériques",
      technologies: ["Zero Trust", "Cryptographie", "Threat Detection"],
      status: "En cours",
      icon: Shield,
      color: "text-red-600"
    },
    {
      title: "Quantum Computing",
      description: "Exploration des algorithmes quantiques pour résoudre des problèmes complexes de calcul",
      technologies: ["Qubits", "Algorithmes Quantiques", "Cryptographie Post-Quantique"],
      status: "Recherche",
      icon: FlaskConical,
      color: "text-green-600"
    },
    {
      title: "IoT & Edge AI",
      description: "Développement de solutions IoT intelligentes avec traitement en périphérie",
      technologies: ["Edge AI", "Sensors", "Real-time Analytics"],
      status: "Développement",
      icon: Rocket,
      color: "text-orange-600"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "En cours": return "bg-green-100 text-green-800 border-green-200";
      case "Recherche": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Développement": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Recherche & Développement
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Notre laboratoire d'innovation explore les technologies émergentes 
            pour créer les solutions de demain et repousser les limites du possible
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {researchAreas.map((area, index) => {
            const IconComponent = area.icon;
            return (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-white shadow-sm ${area.color.replace('text-', 'bg-').replace('-600', '-50')}`}>
                      <IconComponent className={`h-6 w-6 ${area.color}`} />
                    </div>
                    <Badge className={`${getStatusColor(area.status)} font-medium`}>
                      {area.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900 mb-3">
                    {area.title}
                  </CardTitle>
                  <p className="text-gray-600 leading-relaxed">
                    {area.description}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {area.technologies.map((tech, techIndex) => (
                      <Badge 
                        key={techIndex} 
                        variant="outline"
                        className="text-xs bg-white hover:bg-gray-50"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center bg-white border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <University className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Universités Partenaires</h3>
              <p className="text-gray-600">
                Collaboration avec les meilleures universités
              </p>
            </CardContent>
          </Card>

          <Card className="text-center bg-white border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="bg-purple-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FlaskConical className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Labs d'Innovation</h3>
              <p className="text-gray-600">
                Écosystème de recherche et développement avancé
              </p>
            </CardContent>
          </Card>

          <Card className="text-center bg-white border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="bg-green-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Rocket className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Startups Tech</h3>
              <p className="text-gray-600">
                Partenariats avec l'écosystème startup innovant
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}