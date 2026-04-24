from sqlalchemy.orm import Session

from app.core.database import SessionLocal, Base, engine
from app.models.exercise import Exercise
from app.models.user_preference import UserPreference

TEXT_EXERCISES = [
    {
        "title": "Présentation simple",
        "exercise_type": "text",
        "language": "fr",
        "difficulty": "easy",
        "content": "Bonjour à tous, je m'appelle Anthony et j'aime travailler la dactylographie."
    },
    {
        "title": "Ponctuation française",
        "exercise_type": "text",
        "language": "fr",
        "difficulty": "medium",
        "content": "Ce matin, j'ai relu mon texte : il était clair, précis, fluide, et surtout agréable à lire."
    },
    {
        "title": "Accents et liaisons",
        "exercise_type": "text",
        "language": "fr",
        "difficulty": "medium",
        "content": "L'élève sérieux répète régulièrement des phrases précises pour améliorer sa rapidité."
    },
    {
        "title": "Texte narratif court",
        "exercise_type": "text",
        "language": "fr",
        "difficulty": "easy",
        "content": "Le vent soufflait doucement sur la place pendant que les passants traversaient la rue."
    },
    {
        "title": "Concentration et rythme",
        "exercise_type": "text",
        "language": "fr",
        "difficulty": "medium",
        "content": "Pour progresser, il faut taper avec calme, corriger ses fautes et garder un rythme stable."
    },
    {
        "title": "Travail régulier",
        "exercise_type": "text",
        "language": "fr",
        "difficulty": "easy",
        "content": "Une pratique régulière permet de gagner en précision, puis en vitesse, sans perdre en confort."
    },
    {
        "title": "Séquences fréquentes",
        "exercise_type": "text",
        "language": "fr",
        "difficulty": "hard",
        "content": "Certaines séquences comme tion, ent, ou encore ment demandent une attention particulière."
    },
    {
        "title": "Texte soutenu",
        "exercise_type": "text",
        "language": "fr",
        "difficulty": "hard",
        "content": "La qualité d'une frappe ne se mesure pas seulement à la vitesse, mais aussi à la régularité."
    },
    {
        "title": "Texte administratif",
        "exercise_type": "text",
        "language": "fr",
        "difficulty": "medium",
        "content": "Veuillez vérifier les informations indiquées, puis confirmer votre inscription dans le formulaire."
    },
    {
        "title": "Texte descriptif",
        "exercise_type": "text",
        "language": "fr",
        "difficulty": "easy",
        "content": "La lumière du soir dessinait de longues ombres sur les murs clairs de la maison."
    },
]

WORD_LIST_EXERCISES = [
    {
        "title": "Mots fréquents simples",
        "exercise_type": "word_list",
        "language": "fr",
        "difficulty": "easy",
        "content": "bonjour|salut|merci|maison|fenetre|soleil|route|voiture|ami|temps|ville|jour"
    },
    {
        "title": "Mots avec accents",
        "exercise_type": "word_list",
        "language": "fr",
        "difficulty": "medium",
        "content": "élève|français|précis|sérieux|régulier|améliorer|rapidité|qualité|énergie|répéter|clarté|maîtrise"
    },
    {
        "title": "Séquences en ou/on",
        "exercise_type": "word_list",
        "language": "fr",
        "difficulty": "medium",
        "content": "bonjour|raison|maison|pardon|mouton|couleur|douleur|sourire|solution|question|horizon|voisin"
    },
    {
        "title": "Mots courts",
        "exercise_type": "word_list",
        "language": "fr",
        "difficulty": "easy",
        "content": "un|deux|trois|chat|chien|pain|eau|main|jour|nuit|port|mur"
    },
    {
        "title": "Mots scolaires",
        "exercise_type": "word_list",
        "language": "fr",
        "difficulty": "easy",
        "content": "classe|stylo|cahier|tableau|règle|trousse|professeur|élève|lecture|exercice|devoir|réponse"
    },
    {
        "title": "Verbes fréquents",
        "exercise_type": "word_list",
        "language": "fr",
        "difficulty": "medium",
        "content": "être|avoir|faire|dire|aller|venir|prendre|mettre|vouloir|savoir|devoir|pouvoir"
    },
    {
        "title": "Mots administratifs",
        "exercise_type": "word_list",
        "language": "fr",
        "difficulty": "medium",
        "content": "document|inscription|signature|formulaire|référence|vérification|information|confirmation|adresse|identité|dossier|demande"
    },
    {
        "title": "Bigrammes difficiles",
        "exercise_type": "word_list",
        "language": "fr",
        "difficulty": "hard",
        "content": "peine|raison|situation|station|pression|réaction|transition|question|structure|directeur|pratique|stratégie"
    },
    {
        "title": "Mots narratifs",
        "exercise_type": "word_list",
        "language": "fr",
        "difficulty": "easy",
        "content": "forêt|rivière|chemin|lumière|orage|silence|horizon|falaise|nuage|prairie|montagne|vallée"
    },
    {
        "title": "Mots du quotidien",
        "exercise_type": "word_list",
        "language": "fr",
        "difficulty": "easy",
        "content": "cuisine|repas|chaise|bureau|écran|clavier|musique|matin|soirée|travail|pause|café"
    },
]


def seed_exercises(db: Session):
    existing_count = db.query(Exercise).count()
    if existing_count > 0:
        print("Des exercices existent déjà. Seed annulé.")
        return

    for payload in TEXT_EXERCISES + WORD_LIST_EXERCISES:
        exercise = Exercise(**payload)
        db.add(exercise)

    db.commit()
    print("Seed terminé avec succès.")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_exercises(db)
    finally:
        db.close()
