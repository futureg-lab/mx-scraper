from urllib.parse import urljoin
from bs4 import BeautifulSoup
from plugin import MxRequest


def extract_images_and_title(url, req: MxRequest):
    response = req.fetch(url).decode("utf-8")
    soup = BeautifulSoup(response, 'html.parser')
    title = soup.title.string if soup.title else 'No title found'

    img_sources = [urljoin(url, img['src']) for img in soup.find_all('img') if 'src' in img.attrs]

    return title, img_sources