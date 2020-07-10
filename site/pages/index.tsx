// import { useAlone } from 'am-i-alone';

function Home() {
  const { alone, count } = { alone: false, count: 1 };
  
  const verb = count === 1 ? 'is' : 'are';
  const suffix = count === 1 ? '' : 's';
  const text = alone ? 'yes' : 'no';
  
  return (
    <div className="container">
      <div>
        <p className="text">am i alone?</p>
        <h1 className="title">{text}</h1>
        <p className="text">{!alone && `There ${verb} ${count} other${suffix}`}</p>
      </div>
    </div>
  );
};

export default Home;
