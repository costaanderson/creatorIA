"""
publicar_agora.py — Publica imagem única no Instagram
Conta: @brurodrigues_design
"""
import os, sys, time, requests
from pathlib import Path
from dotenv import load_dotenv

# Carrega credenciais
env_file = Path(__file__).parent / ".env"
load_dotenv(env_file)

IG_ID      = os.getenv("INSTAGRAM_BUSINESS_ID")
PAGE_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN")
BASE_URL   = f"https://graph.facebook.com/{os.getenv('META_API_VERSION', 'v19.0')}"

IMAGE_PATH = Path(__file__).parent / "diferenca_henna_tintura.jpeg"

CAPTION = """HENNA ou TINTURA? Muita gente erra na escolha — e isso faz toda a diferença no resultado! 👇

✦ HENNA → pigmenta a PELE
Ideal para corrigir falhas, definir e ter aquele efeito marcadinho ✔️
Dura de 3 a 7 dias

✦ TINTURA → pigmenta os PELOS
Perfeita para cobrir fios brancos, loiros ou muito claros ✔️
Dura até 1 mês nos fios

Qual combina mais com você? Marcadinha ou natural? 👇 Me conta nos comentários!

📍 Agende sua visita — link na bio!

#designdesobrancelhas #henna #tintura #hennasobrancelha #sobrancelhas #sobrancelhasperfeitas #browdesign #sobrancelha #dicasdebeleza #beleza #autocuidado #brurodriguesdesign #designsobrancelha #sobrancelhasnaturais #hennadesign"""


def host_image(image_path):
    print(f"  Enviando imagem para hospedagem...")

    # Tenta litterbox.catbox.moe (armazenamento temporário 72h)
    try:
        with open(image_path, "rb") as f:
            resp = requests.post(
                "https://litterbox.catbox.moe/resources/internals/api.php",
                data={"reqtype": "fileupload", "time": "72h"},
                files={"fileToUpload": (image_path.name, f, "image/jpeg")},
                timeout=60,
            )
        url = resp.text.strip()
        if url.startswith("https://"):
            print(f"  URL publica: {url}")
            return url
    except Exception as e:
        print(f"  litterbox falhou: {e}")

    # Fallback: tmpfiles.org
    try:
        with open(image_path, "rb") as f:
            resp = requests.post(
                "https://tmpfiles.org/api/v1/upload",
                files={"file": (image_path.name, f, "image/jpeg")},
                timeout=60,
            )
        data = resp.json()
        # tmpfiles retorna URL no formato https://tmpfiles.org/XXXXX/filename
        # A URL de download direto é https://tmpfiles.org/dl/XXXXX/filename
        url = data.get("data", {}).get("url", "").replace("tmpfiles.org/", "tmpfiles.org/dl/")
        if url.startswith("https://"):
            print(f"  URL publica: {url}")
            return url
    except Exception as e:
        print(f"  tmpfiles falhou: {e}")

    raise RuntimeError("Nao foi possivel hospedar a imagem. Tente novamente em alguns minutos.")


def create_container(image_url, caption):
    print("  Criando container no Instagram...")
    resp = requests.post(f"{BASE_URL}/{IG_ID}/media", data={
        "access_token": PAGE_TOKEN,
        "image_url": image_url,
        "caption": caption,
    }, timeout=30)
    result = resp.json()
    if "id" not in result:
        raise RuntimeError(f"Erro ao criar container: {result}")
    print(f"  Container ID: {result['id']}")
    return result["id"]


def wait_ready(container_id):
    print("  Aguardando processamento...")
    for i in range(12):
        resp = requests.get(f"{BASE_URL}/{container_id}",
            params={"fields": "status_code", "access_token": PAGE_TOKEN}, timeout=15)
        status = resp.json().get("status_code", "")
        if status == "FINISHED":
            return True
        if status == "ERROR":
            raise RuntimeError(f"Erro no container: {resp.json()}")
        print(f"  Aguardando... {i*5}s")
        time.sleep(5)
    return False


def publish(container_id):
    resp = requests.post(f"{BASE_URL}/{IG_ID}/media_publish", data={
        "access_token": PAGE_TOKEN,
        "creation_id": container_id,
    }, timeout=30)
    result = resp.json()
    if "id" not in result:
        raise RuntimeError(f"Erro ao publicar: {result}")
    return result["id"]


print("\n" + "="*50)
print("  Publicando no @brurodrigues_design")
print("="*50)

try:
    image_url = host_image(IMAGE_PATH)
    container_id = create_container(image_url, CAPTION)
    if not wait_ready(container_id):
        print("ERRO: Timeout. Tente novamente.")
        sys.exit(1)
    post_id = publish(container_id)
    print("\n" + "="*50)
    print(f"  PUBLICADO COM SUCESSO!")
    print(f"  Post ID: {post_id}")
    print(f"  Ver em: https://www.instagram.com/brurodrigues_design/")
    print("="*50)
except Exception as e:
    print(f"\nERRO: {e}")
    sys.exit(1)
