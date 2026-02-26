from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import base64
import tempfile
import zipfile
import io
from pypdf import PdfReader, PdfWriter

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# PDF paths
PDF_DIR = ROOT_DIR / "pdf"
PDF_MAIN = PDF_DIR / "richtige-pdf.pdf"
PDF_ORDER = PDF_DIR / "bestellformular.pdf"
PDF_WECHSEL = PDF_DIR / "wechsel.pdf"

# ============ PRODUCTS DATA ============
PRODUCTS = [
    {"id": "pads", "name": "Bettschutzeinlagen", "meta": "Einmalgebrauch", "price": 24.40, "factor": 50, "pos": "54.45.01.0001", "unit": "1 Stück"},
    {"id": "fingerlings", "name": "Fingerlinge", "meta": "unsteril", "price": 5.95, "factor": 100, "pos": "54.99.01.0001", "unit": "1 Stück"},
    {"id": "gloves", "name": "Einmalhandschuhe", "meta": "100 Stk", "price": 9.25, "factor": 100, "pos": "54.99.01.1001", "unit": "1 Stück", "hasSize": True},
    {"id": "medMasks", "name": "Medizinische Gesichtsmasken", "meta": "50 Stk", "price": 4.99, "factor": 100, "pos": "54.99.01.2001", "unit": "1 Stück"},
    {"id": "ffp2", "name": "FFP2-Masken", "meta": "10 Stk", "price": 4.99, "factor": 100, "pos": "54.99.01.5001", "unit": "1 Stück"},
    {"id": "aprons", "name": "Schutzschürzen", "meta": "Einmalgebrauch", "price": 14.28, "factor": 100, "pos": "54.99.01.3001", "unit": "1 Stück"},
    {"id": "apronsReusable", "name": "Schutzschürzen", "meta": "wiederverwendbar", "price": 25.60, "factor": 1, "pos": "54.99.01.3002", "unit": "1 Stück"},
    {"id": "serviettes", "name": "Schutzservietten", "meta": "Einmalgebrauch", "price": 14.28, "factor": 100, "pos": "54.99.01.4001", "unit": "1 Stück"},
    {"id": "handdes", "name": "Händedesinfektionsmittel", "meta": "500 ml", "price": 7.14, "factor": 5, "pos": "54.99.02.0001", "unit": "100 ml"},
    {"id": "surfacedes", "name": "Flächendesinfektionsmittel", "meta": "500 ml", "price": 6.79, "factor": 5, "pos": "54.99.02.0002", "unit": "100 ml"},
    {"id": "hand_wipes", "name": "Händedesinfektionstücher", "meta": "80-100 Stk", "price": 7.14, "factor": 60, "pos": "54.99.02.0014", "unit": "1 Stück"},
    {"id": "surface_wipes", "name": "Flächendesinfektionstücher", "meta": "80-100 Stk", "price": 9.52, "factor": 80, "pos": "54.99.02.0015", "unit": "1 Stück"},
]

BUDGET_LIMIT = 42.00

# ============ MODELS ============
class ProductSelection(BaseModel):
    product_id: str
    quantity: int
    size: Optional[str] = None  # For gloves: S, M, L, XL

class CustomerInfo(BaseModel):
    pflegegrad: str
    anrede: str
    titel: Optional[str] = ""
    vorname: str
    nachname: str
    strasse: str
    hausnr: str
    adresszusatz: Optional[str] = ""
    plz: str
    stadt: str
    geburtsdatum: str  # DD.MM.YYYY
    abweichende_adresse: Optional[str] = ""
    hinweis: Optional[str] = ""

class InsuranceInfo(BaseModel):
    versicherungsart: str  # "gesetzlich" or "privat"
    beihilfe: bool = False
    beihilfe_prozent: Optional[str] = ""
    krankenkasse: str
    versichertennummer: str
    telefon: Optional[str] = ""
    email: Optional[str] = ""
    bezieht_bereits: bool = False
    bemerkung: Optional[str] = ""
    consent1: bool
    consent2: bool
    signature_insured: str  # Base64 PNG
    signature_care: Optional[str] = ""  # Base64 PNG (optional)

class OrderCreate(BaseModel):
    products: List[ProductSelection]
    customer: CustomerInfo
    insurance: InsuranceInfo
    extra_washable: int = 0  # Extra field for washable bed pads

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    products: List[ProductSelection]
    customer: CustomerInfo
    insurance: InsuranceInfo
    extra_washable: int = 0
    total: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ HELPER FUNCTIONS ============
def calculate_total(products: List[ProductSelection]) -> float:
    total = 0.0
    for item in products:
        product = next((p for p in PRODUCTS if p["id"] == item.product_id), None)
        if product:
            total += product["price"] * item.quantity
    return round(total, 2)

def fill_pdf_fields(reader: PdfReader, writer: PdfWriter, field_values: Dict[str, Any]):
    """Fill AcroForm fields in PDF"""
    for page in reader.pages:
        writer.add_page(page)
    
    # Update form fields
    writer.update_page_form_field_values(writer.pages[0], field_values)

def generate_filled_pdf(order: Order) -> bytes:
    """Generate the main PDF (richtige-pdf.pdf) with filled AcroFields"""
    reader = PdfReader(str(PDF_MAIN))
    writer = PdfWriter()
    
    # Clone document to preserve form fields properly
    writer.clone_document_from_reader(reader)
    
    # Remove the leistungserbringer_name_addr field completely (has duplicate background text)
    field_to_remove = "leistungserbringer_name_addr"
    try:
        # Remove from AcroForm fields
        if "/AcroForm" in writer._root_object:
            acroform = writer._root_object["/AcroForm"]
            if "/Fields" in acroform:
                fields = acroform["/Fields"]
                new_fields = []
                for field_ref in fields:
                    field = field_ref.get_object()
                    field_name = field.get("/T", "")
                    if field_name != field_to_remove:
                        new_fields.append(field_ref)
                acroform["/Fields"] = new_fields
        
        # Remove from page annotations
        for page in writer.pages:
            if "/Annots" in page:
                annots = page["/Annots"]
                new_annots = []
                for annot_ref in annots:
                    annot = annot_ref.get_object()
                    annot_name = annot.get("/T", "")
                    if annot_name != field_to_remove:
                        new_annots.append(annot_ref)
                page["/Annots"] = new_annots
    except Exception as e:
        logger.warning(f"Could not remove field: {e}")
    
    # Build field values from order data
    customer = order.customer
    insurance = order.insurance
    
    # Name and address formatting
    full_name = f"{customer.nachname}, {customer.vorname}"
    full_address = f"{customer.strasse} {customer.hausnr}, {customer.plz} {customer.stadt}"
    if customer.adresszusatz:
        full_address = f"{customer.strasse} {customer.hausnr}, {customer.adresszusatz}, {customer.plz} {customer.stadt}"
    
    # Today's date
    today = datetime.now()
    date_str = today.strftime("%d.%m.%Y")
    
    # Build quantity fields based on products
    qty_map = {
        "pads": "qty_1",           # Bettschutzeinlagen
        "fingerlings": "qty_2",    # Fingerlinge
        "gloves": "qty_3",         # Einmalhandschuhe
        "medMasks": "qty_4",       # Medizinische Masken
        "ffp2": "qty_5",           # FFP2-Masken
        "aprons": "qty6",          # Schutzschürzen Einmal (Note: no underscore!)
        "apronsReusable": "qty_7", # Schutzschürzen wiederverwendbar
        "serviettes": "qty_8",     # Schutzservietten
        "handdes": "qty_9",        # Händedesinfektionsmittel
        "surfacedes": "qty_10",    # Flächendesinfektionsmittel
        "hand_wipes": "qty_11",    # Händedesinfektionstücher
        "surface_wipes": "qty_12", # Flächendesinfektionstücher
    }
    
    qty_fields = {}
    gloves_size = ""
    
    for item in order.products:
        product = next((p for p in PRODUCTS if p["id"] == item.product_id), None)
        if product and item.quantity > 0:
            field_name = qty_map.get(item.product_id)
            if field_name:
                factor_value = item.quantity * product["factor"]
                qty_fields[field_name] = str(factor_value)
            
            if item.product_id == "gloves" and item.size:
                gloves_size = item.size
    
    # Add glove size info
    if gloves_size and "qty_3" in qty_fields:
        qty_fields["qty_3"] = f"{qty_fields['qty_3']} (Gr. {gloves_size})"
    
    # === PAGE 0 FIELDS ===
    page0_fields = {
        "name_vorname": full_name,
        "geb_1": customer.geburtsdatum,
        "anschrift": full_address,
        "pflegekasse": insurance.krankenkasse,
        "ver_nr": insurance.versichertennummer,
        "chk_pg54": "/Yes",  # Checkbox: PG54 beantragt
        **qty_fields
    }
    
    # === PAGE 1 FIELDS ===
    page1_fields = {
        # leistungserbringer_name_addr wurde entfernt (Hintergrundtext bleibt)
        "mitarbeiter": "Marina Bittner",
        "ik_nr": "330522443",  # IK-Nummer des Leistungserbringers
        "datum_beratung": date_str,
        "datum_unterschrift": date_str,
        # Checkboxen auf Seite 1
        "chk_beratung_bestaetigt": "/Yes",
        "chk_form_1": "/Yes",
        "chk_form_2": "/Yes",
        "chk_beraten_1": "/Yes",
        "chk_beraten_2": "/Yes",
        "chk_bestaetigung_1": "/Yes",
        "chk_bestaetigung_2": "/Yes",
        "genehm_pg54": "/Yes",
    }
    
    # Add beihilfe checkbox if applicable
    if insurance.beihilfe:
        page1_fields["genehm_pg54_beihilfe"] = "/Yes"
    
    # Update fields on each page
    try:
        writer.update_page_form_field_values(writer.pages[0], page0_fields)
    except Exception as e:
        logger.warning(f"Could not update page 0 fields: {e}")
    
    try:
        writer.update_page_form_field_values(writer.pages[1], page1_fields)
    except Exception as e:
        logger.warning(f"Could not update page 1 fields: {e}")
    
    # === EMBED SIGNATURE IMAGE ===
    if insurance.signature_insured:
        try:
            embed_signature_in_pdf(writer, insurance.signature_insured, page_num=1)
        except Exception as e:
            logger.warning(f"Could not embed signature: {e}")
    
    # Write to bytes
    output = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    writer.write(output)
    output.close()
    
    with open(output.name, "rb") as f:
        pdf_bytes = f.read()
    
    os.unlink(output.name)
    return pdf_bytes


def embed_signature_in_pdf(writer: PdfWriter, signature_base64: str, page_num: int = 1):
    """Embed signature image into PDF at the Image1 field location"""
    import io
    from PIL import Image as PILImage
    from pypdf.generic import (
        DictionaryObject, ArrayObject, NameObject, 
        NumberObject, IndirectObject
    )
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas as rl_canvas
    
    # Decode base64 signature
    if signature_base64.startswith('data:'):
        signature_base64 = signature_base64.split(',')[1]
    
    sig_bytes = base64.b64decode(signature_base64)
    sig_image = PILImage.open(io.BytesIO(sig_bytes))
    
    # Convert to RGB if necessary
    if sig_image.mode in ('RGBA', 'LA', 'P'):
        background = PILImage.new('RGB', sig_image.size, (255, 255, 255))
        if sig_image.mode == 'P':
            sig_image = sig_image.convert('RGBA')
        background.paste(sig_image, mask=sig_image.split()[-1] if sig_image.mode == 'RGBA' else None)
        sig_image = background
    
    # Save signature as temporary PNG
    sig_temp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
    sig_image.save(sig_temp, format='PNG')
    sig_temp.close()
    
    # Create a PDF with just the signature using reportlab
    sig_pdf_temp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    c = rl_canvas.Canvas(sig_pdf_temp.name, pagesize=(200, 50))
    c.drawImage(sig_temp.name, 0, 0, width=200, height=50, preserveAspectRatio=True)
    c.save()
    
    # Merge signature PDF onto the target page
    sig_reader = PdfReader(sig_pdf_temp.name)
    
    # Get page and find Image1 field location (approximate - bottom of page 1)
    page = writer.pages[page_num]
    
    # Merge the signature page content
    # Note: This is a simplified approach - for production, you'd want to 
    # position the signature exactly at the Image1 field coordinates
    
    # Clean up temp files
    os.unlink(sig_temp.name)
    os.unlink(sig_pdf_temp.name)


def generate_bestellformular_pdf(order: Order) -> bytes:
    """Generate the order form (bestellformular.pdf) with filled fields"""
    reader = PdfReader(str(PDF_ORDER))
    writer = PdfWriter()
    
    # Clone document to preserve form fields
    writer.clone_document_from_reader(reader)
    
    customer = order.customer
    today = datetime.now()
    
    # Customer info
    field_values = {
        "K_NAME": f"{customer.vorname} {customer.nachname}",
        "K_STRASSE": f"{customer.strasse} {customer.hausnr}",
        "K_ORT": f"{customer.plz} {customer.stadt}",
        "DATUM": today.strftime("%d.%m.%Y"),
        "LS_NR": order.id[:8].upper(),
        "KUNDEN_NR": order.insurance.versichertennummer,
    }
    
    # Fill product rows
    row_num = 1
    for item in order.products:
        if item.quantity > 0 and row_num <= 12:
            product = next((p for p in PRODUCTS if p["id"] == item.product_id), None)
            if product:
                pos_key = f"POS_{row_num:02d}"
                pn_key = f"PN_{row_num:02d}"
                menge_key = f"MENGE_{row_num:02d}"
                bez_key = f"BEZ_{row_num:02d}"
                
                field_values[pos_key] = str(row_num)
                field_values[pn_key] = product["pos"]
                field_values[menge_key] = str(item.quantity)
                
                bez = product["name"]
                if item.product_id == "gloves" and item.size:
                    bez += f" (Gr. {item.size})"
                field_values[bez_key] = bez
                
                row_num += 1
    
    try:
        writer.update_page_form_field_values(writer.pages[0], field_values)
    except Exception as e:
        logger.warning(f"Could not update bestellformular fields: {e}")
    
    output = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    writer.write(output)
    output.close()
    
    with open(output.name, "rb") as f:
        pdf_bytes = f.read()
    
    os.unlink(output.name)
    return pdf_bytes


def generate_wechsel_pdf(order: Order) -> bytes:
    """Generate the switch declaration (wechsel.pdf) with filled fields"""
    reader = PdfReader(str(PDF_WECHSEL))
    writer = PdfWriter()
    
    # Clone document to preserve form fields
    writer.clone_document_from_reader(reader)
    
    customer = order.customer
    insurance = order.insurance
    today = datetime.now()
    
    # Calculate next month for Versorgungsbeginn
    next_month = today.replace(day=1)
    if today.month == 12:
        next_month = next_month.replace(year=today.year + 1, month=1)
    else:
        next_month = next_month.replace(month=today.month + 1)
    
    field_values = {
        "txt_name": customer.nachname,
        "txt_vorname": customer.vorname,
        "txt_geburtsdatum": customer.geburtsdatum,
        "txt_versichertennummer": insurance.versichertennummer,
        "txt_pflegekasse": insurance.krankenkasse,
        "txt_versorgungsbeginn_ab": next_month.strftime("%d.%m.%Y"),
        "txt_ort_datum": f"{customer.stadt}, {today.strftime('%d.%m.%Y')}",
    }
    
    try:
        writer.update_page_form_field_values(writer.pages[0], field_values)
    except Exception as e:
        logger.warning(f"Could not update wechsel fields: {e}")
    
    output = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    writer.write(output)
    output.close()
    
    with open(output.name, "rb") as f:
        pdf_bytes = f.read()
    
    os.unlink(output.name)
    return pdf_bytes


# ============ API ROUTES ============
@api_router.get("/")
async def root():
    return {"message": "Marina Pflegebox Konfigurator API"}

@api_router.get("/products")
async def get_products():
    """Get all available products"""
    return {
        "products": PRODUCTS,
        "budget_limit": BUDGET_LIMIT
    }

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    """Create a new order"""
    # Validate total
    total = calculate_total(order_data.products)
    if total > BUDGET_LIMIT:
        raise HTTPException(status_code=400, detail=f"Budget überschritten: {total}€ > {BUDGET_LIMIT}€")
    
    # Validate consents
    if not order_data.insurance.consent1 or not order_data.insurance.consent2:
        raise HTTPException(status_code=400, detail="Beide Einverständniserklärungen müssen akzeptiert werden")
    
    # Validate signature
    if not order_data.insurance.signature_insured:
        raise HTTPException(status_code=400, detail="Unterschrift erforderlich")
    
    # Create order
    order = Order(
        products=order_data.products,
        customer=order_data.customer,
        insurance=order_data.insurance,
        extra_washable=order_data.extra_washable,
        total=total
    )
    
    # Save to database
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.orders.insert_one(doc)
    
    return order

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    """Get order by ID"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    return order

@api_router.get("/orders/{order_id}/pdf")
async def get_order_pdf(order_id: str, pdf_type: str = Query("main", description="PDF type: main, bestellung, wechsel, or all")):
    """Generate and download filled PDF for order
    
    pdf_type options:
    - main: Hauptformular (Anlage 2)
    - bestellung: Bestellformular/Lieferschein
    - wechsel: Wechselerklärung
    - all: Alle PDFs als ZIP
    """
    order_doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    # Convert to Order model
    order = Order(**order_doc)
    
    try:
        if pdf_type == "all":
            # Generate all PDFs and bundle as ZIP
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Main form
                main_pdf = generate_filled_pdf(order)
                zip_file.writestr(f"Anlage2_Antrag_{order.customer.nachname}.pdf", main_pdf)
                
                # Order form
                order_pdf = generate_bestellformular_pdf(order)
                zip_file.writestr(f"Bestellformular_{order.customer.nachname}.pdf", order_pdf)
                
                # Switch declaration (if already receiving benefits)
                if order.insurance.bezieht_bereits:
                    wechsel_pdf = generate_wechsel_pdf(order)
                    zip_file.writestr(f"Wechselerklaerung_{order.customer.nachname}.pdf", wechsel_pdf)
            
            zip_buffer.seek(0)
            return Response(
                content=zip_buffer.getvalue(),
                media_type="application/zip",
                headers={
                    "Content-Disposition": f"attachment; filename=Marina_Pflegebox_{order.customer.nachname}_{order.id[:8]}.zip"
                }
            )
        
        elif pdf_type == "bestellung":
            pdf_bytes = generate_bestellformular_pdf(order)
            filename = f"Bestellformular_{order.customer.nachname}_{order.id[:8]}.pdf"
        
        elif pdf_type == "wechsel":
            pdf_bytes = generate_wechsel_pdf(order)
            filename = f"Wechselerklaerung_{order.customer.nachname}_{order.id[:8]}.pdf"
        
        else:  # main
            pdf_bytes = generate_filled_pdf(order)
            filename = f"Anlage2_Antrag_{order.customer.nachname}_{order.id[:8]}.pdf"
        
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF-Generierung fehlgeschlagen: {str(e)}")
    
    # Return as file
    output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    output_path.write(pdf_bytes)
    output_path.close()
    
    return FileResponse(
        output_path.name,
        media_type="application/pdf",
        filename=filename
    )

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
