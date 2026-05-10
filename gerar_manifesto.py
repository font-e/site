import os
import json

def gerar_manifesto():
    # No repo 'img', a pasta 'full' está na raiz
    base_path = "full"
    categorias = ["trabalhos", "noticias", "expos"]
    manifesto = {}

    for cat in categorias:
        cat_path = os.path.join(base_path, cat)
        manifesto[cat] = {}
        
        if os.path.exists(cat_path) and os.path.isdir(cat_path):
            for pasta_obra in os.listdir(cat_path):
                obra_path = os.path.join(cat_path, pasta_obra)
                if os.path.isdir(obra_path):
                    # Filtra imagens e ordena
                    arquivos = [f for f in os.listdir(obra_path) 
                               if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.avif'))]
                    manifesto[cat][pasta_obra] = sorted(arquivos)

    # Salva na raiz do repositório 'img'
    with open("manifesto.json", "w", encoding="utf-8") as f:
        json.dump(manifesto, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    gerar_manifesto()
