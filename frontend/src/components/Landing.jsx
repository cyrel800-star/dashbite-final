import { Logo, Food, RestaurantCard } from "../ui/components.jsx";
import { RESTAURANTS } from "../data/sample.js";
import { heroBurger } from "../data/images.js";
import { LOCAL_KEYS, readLocalData } from "../lib/localData.js";
import Icon from "../ui/Icon.jsx";

// Public landing page, navigation, feature highlights, and restaurant previews.
export default function Landing({ onSwitch }) {
  const featureImages = readLocalData(LOCAL_KEYS.featureImages, {});
  const heroImage = featureImages.hero || heroBurger;
  const feats = [["motorcycle", "Fast Delivery", "Get your food quickly", featureImages.fastDelivery], ["shield", "Secure Payment", "Pay safely and securely", featureImages.securePayment], ["star", "Top Rated Restaurants", "Only the best for you", featureImages.topRestaurants], ["headphones", "24/7 Support", "We’re here to help", featureImages.support]];
  return (
    <>
      <header className="nav" id="home">
        <Logo />
        {/* Keep the public navigation limited to working in-page destinations. */}
        <nav aria-label="Main navigation">
          <a className="on" href="#home" aria-current="page">Home</a>
          <a href="#about">About</a>
        </nav>
        <button className="btn ol sm" onClick={() => onSwitch("signin")}>Sign In</button>
        <button className="btn sm" onClick={() => onSwitch("signup")}>Sign Up</button>
      </header>
      <section className="hero">
        <div>
          <span className="pill"><Icon name="utensils" size={16} /> Fast · Fresh · Local</span>
          <h1>Your Favorite Food <span>Delivered Fast</span></h1>
          <p style={{ fontSize: 17, maxWidth: 460 }}>Order from the best local restaurants and get it delivered to your door.</p>
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <button className="btn" onClick={() => onSwitch("signup")}>Order Now →</button>
            <a className="btn ol" href="#about">▶ Learn More</a>
          </div>
        </div>
        <Food src={heroImage} alt="Featured DashBite food" className="heroimg" />
      </section>
      {/* About copy and feature highlights share the About navigation target. */}
      <section id="about" className="about" aria-labelledby="about-title">
        <div className="about-copy">
          <span className="pill">About DashBite</span>
          <h2 id="about-title">Good Food. Faster Delivery.</h2>
          <p>DashBite brings local restaurants, delicious meals, and convenient delivery together in one place.</p>
        </div>
        <div className="feat">{feats.map(([icon, t, s, image]) => <div key={t}>{image ? <img className="feat-img" src={image} alt="" /> : <em><Icon name={icon} size={28} /></em>}<span><b>{t}</b><small>{s}</small></span></div>)}</div>
      </section>
      {/* Restaurant previews lead visitors to sign in before ordering. */}
      <section className="sec">
        <div className="row"><h2>Popular Restaurants</h2><button className="or" style={{ background: "none", border: 0 }} onClick={() => onSwitch("signin")}>View All Restaurants →</button></div>
        <div className="grid4">
          {RESTAURANTS.map((r) => <RestaurantCard key={r.name} r={r} fav={false} onFav={() => onSwitch("signin")} />)}
          <div className="promo"><h3>Good Food<br /><span className="or">Faster Delivery</span></h3><span>Download our app today!</span><button className="btn sm" style={{ width: "max-content" }} onClick={() => onSwitch("signup")}>Get the App →</button></div>
        </div>
      </section>
      <footer><span>© 2026 DashBite. Good food, faster delivery.</span></footer>
    </>
  );
}
