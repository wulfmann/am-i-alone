import { useAlone } from 'am-i-alone';
import Head from 'next/head';

function Home() {
  const { connected, tally, alone, wave } = useAlone(domain);
  
  const verb = count === 1 ? 'is' : 'are';
  const suffix = count === 1 ? '' : 's';
  const text = alone ? 'yes' : 'no';
  
  return (
    <>
    <Head>
      <title>Am I Alone?</title>
    </Head>
    <div className="container">
      <div>
        <div className="main">
          <p className="text">am i alone?</p>
          <h1 className="title">{text}</h1>
          <p className="text">{!alone && `There ${verb} ${count} other${suffix}`}</p>
        </div>
        {!alone && (
          <div className="action">
            <p className="text">say hi<span className="emoji">👋</span></p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default Home;
