from sqlalchemy import select

from api.core.database import SessionLocal
from api.core.security import hash_password
from models.entities import Company, CompanyDistrict, District, FareConfig, Province, Role, User

PROVINCES: dict[str, list[str]] = {
    "Kigali City": ["Gasabo", "Kicukiro", "Nyarugenge"],
    "Eastern Province": ["Bugesera", "Gatsibo", "Kayonza", "Kirehe", "Ngoma", "Nyagatare", "Rwamagana"],
    "Northern Province": ["Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"],
    "Southern Province": ["Gisagara", "Huye", "Kamonyi", "Muhanga", "Nyamagabe", "Nyanza", "Nyaruguru", "Ruhango"],
    "Western Province": ["Karongi", "Ngororero", "Nyabihu", "Nyamasheke", "Rubavu", "Rusizi", "Rutsiro"],
}

INITIAL_COMPANIES = {
    "Yahoo": "Eastern Province",
    "Horizon": "Southern Province",
    "Volcano": "Northern Province",
}


def seed():
    with SessionLocal() as db:
        for province_name, districts in PROVINCES.items():
            province = db.scalar(select(Province).where(Province.name == province_name))
            if not province:
                province = Province(name=province_name)
                db.add(province)
                db.flush()
            for district_name in districts:
                district = db.scalar(select(District).where(District.name == district_name))
                if not district:
                    db.add(District(name=district_name, province_id=province.id))
        db.commit()

        for company_name, province_name in INITIAL_COMPANIES.items():
            company = db.scalar(select(Company).where(Company.name == company_name))
            if not company:
                company = Company(name=company_name, is_active=True)
                db.add(company)
                db.flush()
            district_rows = db.scalars(
                select(District).join(Province, Province.id == District.province_id).where(Province.name == province_name)
            ).all()
            for district in district_rows:
                link = db.scalar(
                    select(CompanyDistrict).where(
                        CompanyDistrict.company_id == company.id, CompanyDistrict.district_id == district.id
                    )
                )
                if not link:
                    db.add(CompanyDistrict(company_id=company.id, district_id=district.id))
        db.commit()

        admin = db.scalar(select(User).where(User.email == "admin@pbs.rw"))
        if not admin:
            db.add(
                User(
                    email="admin@pbs.rw",
                    full_name="System Admin",
                    password_hash=hash_password("Admin@12345"),
                    role=Role.SUPER_ADMIN,
                    company_id=None,
                    is_active=True,
                )
            )
        fare = db.scalar(select(FareConfig))
        if not fare:
            db.add(FareConfig(base_rwf_per_km=50))
        db.commit()


if __name__ == "__main__":
    seed()

